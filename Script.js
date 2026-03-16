// HTML krijgt JS class om anders te stijlen met en zonder JS
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  // Als JS laad, geef de form dan novalidate
  const form = document.querySelector("form");

  if (form) {
    form.setAttribute("novalidate", "");
  }

  // Alle vragen die zichtbaar moeten zijn na een specifiek antwoord
  const conditionalBlocks = document.querySelectorAll(
    ".conditional[data-show-when]",
  );

  // Helper functie, checkt of veld leeg is
  const isEmpty = (value) => value.trim() === "";

  // Checkt alleen getoonde velden, checkt niet verstopte velden
  const isActiveField = (field) => field && !field.disabled;
  const $ = (id) => document.getElementById(id);

  // Initialiseer alle errors
  function initFieldErrors() {
    // Verstop alle errors tijdens het laden
    document.querySelectorAll(".error").forEach((el) => {
      el.hidden = true;
    });

    // Make all fields 'not invalid yet'
    document.querySelectorAll("input, select, textarea").forEach((field) => {
      field.removeAttribute("aria-invalid");
    });
  }

  /********************************************/
  /* MARK: ERRORS BIJ VELD TONEN OF VERBERGEN */
  /********************************************/

  // Zet custom validity op het veld
  function setFieldError(field, message = "") {
    if (!field) return;

    // Zet aria-invalid op true of false
    field.setCustomValidity(message);
    field.setAttribute("aria-invalid", message ? "true" : "false");

    // Zoekt de gekoppelde .error via aria-describedbt
    const errorId = (field.getAttribute("aria-describedby") || "")
      .split(" ")
      .find(
        (id) => id.endsWith("-error") && id !== "authorized-person-group-error",
      );

    // Toont of verbergt die foutmelding
    const errorEl = errorId ? $(errorId) : null;

    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = !message;
    }
  }

  /*************************************/
  /* MARK: FOUTMELDING VOOR HELE GROEP */
  /*************************************/

  // Wordt gebruikt voor een groep inputs
  // bij vraag "vul 1 van de 3 in"
  function setGroupError(id, message = "") {
    const errorEl = $(id);
    if (!errorEl) return;

    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  // Maakt een veld leeg op uncheckt een radio
  // Wist ook foutmelding
  function resetField(field) {
    if (field.type === "radio") {
      field.checked = false;
    } else {
      field.value = "";
    }

    field.setCustomValidity("");
    field.setAttribute("aria-invalid", "false");
  }

  // Zoek welke radio met dezelfde name is aangeklikt en geef de value terug
  // bijv: name="married" dan is gekozen waarde: ="yes"
  function getRadioValue(name) {
    return (
      document.querySelector(`input[type="radio"][name="${name}"]:checked`)
        ?.value ?? null
    );
  }

  /***************************************/
  /* MARK: CONDITIONALE VRAGEN SHOW/HIDE */
  /***************************************/

  function updateConditionalVisibility() {
    conditionalBlocks.forEach((block) => {
      const [fieldName, rawValues] = block.dataset.showWhen.trim().split(":");
      if (!fieldName || !rawValues) return;

      const shouldShow = rawValues
        .split(",")
        .map((value) => value.trim())
        .includes(getRadioValue(fieldName));

      block.classList.toggle("is-visible", shouldShow);

      block.querySelectorAll("input, select, textarea").forEach((field) => {
        field.disabled = !shouldShow;

        if (!shouldShow) {
          resetField(field);
          field.removeAttribute("required");
        } else if (field.dataset.requiredWhenVisible !== undefined) {
          field.setAttribute("required", "");
        }
      });

      block.querySelectorAll(".error").forEach((errorEl) => {
        errorEl.hidden = true;
        errorEl.textContent = "";
      });
    });
  }

  /******************************/
  /* MARK: LIVEVALIDATIE LOGICA */
  /******************************/

  // Checkt wanneer er live validatie moet gebeuren
  function shouldLiveValidate(field) {
    const value = field.value.trim();

    // BSN alleen live valideren bij 8+ tekens
    if (field.id === "bsn" || field.id === "bsn-authorized-person") {
      return value.length >= 8;
    }

    // Beconnummer alleen live valideren bij 7+ tekens
    if (field.id === "beconnumber") {
      return value.length >= 7;
    }

    // Protocolnummer alleen live valideren bij 6+ tekens
    if (
      field.id === "protocol-number" ||
      field.id === "protocolnumber-authorized-person"
    ) {
      return value.length >= 6;
    }

    // Postcode alleen live valideren vanaf 124AB, spatie telt niet mee
    if (field.id === "zip-code" || field.id === "zip-code-2") {
      return value.replace(/\s/g, "").length >= 6;
    }

    // Email alleen live valideren zodra er een @ in staat
    if (field.id === "email") {
      return value.includes("@");
    }

    return true;
  }

  /************************/
  /* MARK: BASISVALIDATIE */
  /************************/

  // Controleert of het veld actief is
  function validateRequiredText(field, message) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    // Controleert of het veld verplicht is
    if (field.required && isEmpty(field.value)) {
      setFieldError(field, message);
      return false;
    }

    // Is het veld leeg? Zo niet, wordt er een foutmelding gezet
    setFieldError(field, "");
    return true;
  }

  /***************************/
  /* MARK: PATTERN VALIDATIE */
  /***************************/

  // Herbruibare functie die controleert:
  function validatePattern(
    field,
    { requiredMessage, invalidMessage, pattern },
  ) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    const value = field.value.trim();

    // Als het verplicht en leeg is, stuur requiredMessage
    if (field.required && isEmpty(value)) {
      setFieldError(field, requiredMessage);
      return false;
    }

    // Als ingevuld is, maar regex is fout, stuur invalidMessage
    if (!isEmpty(value) && !pattern.test(value)) {
      setFieldError(field, invalidMessage);
      return false;
    }

    // Anders -> veld is geldig
    setFieldError(field, "");
    return true;
  }

  /*********************************/
  /* MARK: NORMALIZERS VOOR VELDEN */
  /*********************************/

  function normalizeInitials(value) {
    return value
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .split("")
      .slice(0, 10)
      .map((l) => l + ".")
      .join("");
  }

  function normalizePostcode(value) {
    const cleaned = value.replace(/\s+/g, "").toUpperCase();

    if (cleaned.length <= 4) return cleaned;
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)}`;
  }

  function normalizeBsn(value) {
    return value.replace(/\D/g, "");
  }

  // De functies hieronder gebruiken validatePattern of eigen logica:
  // Voorletters, controleert formaat zoals M. of M.M.
  function validateInitials(field) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    let value = field.value.trim();

    if (field.required && isEmpty(value)) {
      setFieldError(field, "Vul uw voorletter(s) in.");
      return false;
    }

    value = normalizeInitials(value);
    field.value = value;

    if (!/^([A-Z]\.){1,10}$/.test(value)) {
      setFieldError(
        field,
        "Vul geldige voorletters in, bijvoorbeeld J. of J.P.",
      );
      return false;
    }

    setFieldError(field, "");
    return true;
  }

  // BSN nummer, controleert 8 of 9 cijfers
  function validateBsn(field) {
    return validatePattern(field, {
      requiredMessage: "Vul het BSN in.",
      invalidMessage: "Een BSN of RSIN moet uit 8 of 9 cijfers bestaan.",
      pattern: /^\d{8,9}$/,
    });
  }

  // Beconnummer, controleert 7 cijfers
  function validateBecon(field) {
    return validatePattern(field, {
      requiredMessage: "Vul het beconnummer in.",
      invalidMessage: "Een beconnummer moet uit 7 cijfers bestaan.",
      pattern: /^\d{7}$/,
    });
  }

  // Protocolnummer, controleert 6 cijfers
  function validateProtocol(field) {
    return validatePattern(field, {
      requiredMessage: "Vul het protocolnummer in.",
      invalidMessage: "Een protocolnummer moet uit 6 cijfers bestaan.",
      pattern: /^\d{6}$/,
    });
  }

  // Postcode, controleert Nederlandse postcode
  function validateDutchPostcode(field) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    if (field.required && isEmpty(field.value)) {
      setFieldError(field, "Vul een postcode in.");
      return false;
    }

    field.value = normalizePostcode(field.value);

    if (
      !isEmpty(field.value) &&
      !/^[1-9][0-9]{3}\s?[A-Z]{2}$/.test(field.value)
    ) {
      setFieldError(
        field,
        "Vul een geldige postcode in, bijvoorbeeld 1234 AB.",
      );
      return false;
    }

    setFieldError(field, "");
    return true;
  }

  /*****************************/
  /* MARK: STANDAARD VALIDATIE */
  /*****************************/

  // Datum, controleert of datum geldig is
  function validateDate(field, message) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    const value = field.value.trim();

    if (field.required && isEmpty(value)) {
      setFieldError(field, message);
      return false;
    }

    if (!isEmpty(value) && !field.checkValidity()) {
      setFieldError(field, message);
      return false;
    }

    setFieldError(field, "");
    return true;
  }

  // Email, gebruikt ingebouwde email-validatie van browser
  function validateEmail(field) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    const value = field.value.trim();

    if (field.required && isEmpty(value)) {
      setFieldError(field, "Vul een e-mailadres in.");
      return false;
    }

    if (!isEmpty(value) && !field.checkValidity()) {
      setFieldError(field, "Vul een geldig e-mailadres in.");
      return false;
    }

    setFieldError(field, "");
    return true;
  }

  // Telefoonnummer, is optioneel maar als er iets in staat moet dit op een telefoonnummer lijken
  function validateOptionalTel(field) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    const value = field.value.trim();

    if (isEmpty(value)) {
      setFieldError(field, "");
      return true;
    }

    if (!/^[0-9+\s()\-]{6,20}$/.test(value)) {
      setFieldError(field, "Vul een geldig telefoonnummer in.");
      return false;
    }

    setFieldError(field, "");
    return true;
  }

  /*********************************/
  /* MARK: KEUZE GEMAAKT VALIDATIE */
  /*********************************/

  // Kijkt of er binnen radio group een keuze is gemaakt
  function validateRadioGroup(name, message) {
    const radios = document.querySelectorAll(
      `input[type="radio"][name="${name}"]`,
    );
    if (!radios.length) return true;

    // Eerste radio krijgt custom validity message en groepsfoutmelding wordt zichtbaar
    const activeRadios = [...radios].filter((radio) => !radio.disabled);
    if (!activeRadios.length) {
      setGroupError(`${name}-error`, "");
      return true;
    }

    const checked = activeRadios.some((radio) => radio.checked);

    // Als er wel een keuze is gemaakt, wordt error weggehaald
    activeRadios.forEach((radio, index) => {
      radio.setAttribute("aria-invalid", checked ? "false" : "true");
      radio.setCustomValidity(index === 0 && !checked ? message : "");
    });

    setGroupError(`${name}-error`, checked ? "" : message);
    return checked;
  }

  /***********************/
  /* MARK: DATUM GRENZEN */
  /***********************/

  // Checkt huidige datum
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Hierin stel ik in: max = vandaag en min = 20 maanden geleden
  const dateOfDeath = $("date-of-death");
  if (dateOfDeath) {
    const past = new Date(today);
    past.setMonth(today.getMonth() - 20);

    dateOfDeath.max = todayStr;
    dateOfDeath.min = past.toISOString().split("T")[0];
  }

  // Andere datumvelden
  ["conditions-date", "date-testament"].forEach((id) => {
    const field = $(id);
    if (field) field.max = todayStr;
  });

  /*********************/
  /* MARK: LANDENLIJST */
  /*********************/

  // Array met landen en landcodes
  const countries = [
    { code: "AFG", name: "Afghanistan" },
    { code: "ALB", name: "Albanië" },
    { code: "BEL", name: "België" },
    { code: "DEU", name: "Duitsland" },
    { code: "ESP", name: "Spanje" },
    { code: "FRA", name: "Frankrijk" },
    { code: "GBR", name: "Verenigd Koninkrijk" },
    { code: "ITA", name: "Italië" },
    { code: "NLD", name: "Nederland" },
    { code: "USA", name: "Verenigde Staten" },
    { code: "XXX", name: "Onbekend / niet in lijst" },
  ];

  const countryInput = $("country-input");
  const countryHidden = $("country-code");
  const datalist = $("country-codes");

  // Vult automatisch <datalist> met de landen als opties
  if (countryInput && countryHidden && datalist) {
    countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = `${country.code} ${country.name}`;
      datalist.appendChild(option);
    });
  }

  const normalize = (value) => value.trim().toLowerCase();

  /**********************************/
  /* MARK: LAND VALIDATIE + OPSLAAN */
  /**********************************/

  // Kijkt of het veld actief is
  function validateCountry() {
    if (!countryInput || !countryHidden || !isActiveField(countryInput)) {
      setFieldError(countryInput, "");
      return true;
    }

    const value = countryInput.value.trim();

    // Checkt of het verplicht en leeg is
    if (countryInput.required && isEmpty(value)) {
      countryHidden.value = "";
      setFieldError(countryInput, "Vul een land in.");
      return false;
    }

    if (isEmpty(value)) {
      countryHidden.value = "";
      setFieldError(countryInput, "");
      return true;
    }

    // Zoekt of invoer overeenkomt met land of landcode
    const match = countries.find((country) => {
      const full = `${country.code} ${country.name}`;
      // Geldig, input toont landnaam, hidden input krijgt landcode
      return (
        normalize(country.code) === normalize(value) ||
        normalize(country.name) === normalize(value) ||
        normalize(full) === normalize(value)
      );
    });

    if (!match) {
      countryHidden.value = "";
      // geen match is foutmelding tonen
      setFieldError(countryInput, "Kies een geldig land uit de lijst.");
      return false;
    }

    countryInput.value = match.name;
    countryHidden.value = match.code;
    setFieldError(countryInput, "");
    return true;
  }

  if (countryInput) {
    countryInput.addEventListener("change", validateCountry);
    countryInput.addEventListener("blur", validateCountry);
    countryInput.addEventListener("input", () => {
      if (countryHidden) countryHidden.value = "";
      setFieldError(countryInput, "");
    });
  }

  /***********************************/
  /* MARK: "1 VAN 3" GROEP VALIDATIE */
  /***********************************/

  // Voor bsn, beconnummer en protocolnummer
  const authorizedFields = [
    $("bsn-authorized-person"),
    $("beconnumber"),
    $("protocolnumber-authorized-person"),
  ].filter(Boolean);

  // Kijk of 1 van de 3 is ingevuld
  function validateAuthorizedGroup() {
    if (!authorizedFields.length) return true;

    const filledField = authorizedFields.find((field) => !isEmpty(field.value));

    // Zodra een veld is ingevuld, andere velden dissabelen
    authorizedFields.forEach((field) => {
      field.disabled = !!filledField && field !== filledField;
    });

    // Als geen veld is gevuld, groepsfout tonen
    if (!filledField) {
      authorizedFields.forEach((field) => {
        setFieldError(field, "");
      });

      setGroupError(
        "authorized-person-group-error",
        "Vul 1 van deze 3 velden in.",
      );

      return false;
    }

    setGroupError("authorized-person-group-error", "");

    authorizedFields.forEach((field) => {
      if (field !== filledField) {
        setFieldError(field, "");
      }
    });

    // Als een veld wel is ingevuld, alleen dat ene veld inhoudelijk valideren
    if (filledField.id === "bsn-authorized-person") {
      return validateBsn(filledField);
    }

    if (filledField.id === "beconnumber") {
      return validateBecon(filledField);
    }

    return validateProtocol(filledField);
  }

  authorizedFields.forEach((field) => {
    field.addEventListener("blur", () => {
      field.dataset.touched = "true";
      validateAuthorizedGroup();
    });

    field.addEventListener("input", () => {
      const isTouched = field.dataset.touched === "true";
      const hasError = field.getAttribute("aria-invalid") === "true";

      if (isTouched || hasError) {
        validateAuthorizedGroup();
      }
    });
  });

  // Als je op reset klikt, worden alle drie de velden geleegd
  const resetBtn = $("reset-fields");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      authorizedFields.forEach((field) => {
        field.value = "";
        // ook weer enabled
        field.disabled = false;
        // en fouten verdwijnen
        setFieldError(field, "");
      });
      setGroupError("authorized-person-group-error", "");
    });
  }

  /***********************/
  /* MARK: VALIDATOR MAP */
  /***********************/

  // Hier koppel ik IDs aan de juiste validatiefunctie
  // Dit doe ik omdat ik dan niet voor elk los veld een losse submit-code hoef te schrijven
  const validators = {
    initials: validateInitials,

    bsn: validateBsn,

    "last-name": (field) =>
      validateRequiredText(field, "Vul een achternaam in."),

    "date-of-death": (field) =>
      validateDate(field, "Vul een geldige overlijdensdatum in."),

    "conditions-date": (field) =>
      validateDate(field, "Vul een geldige datum in."),

    "protocol-number": validateProtocol,

    "initial-2": validateInitials,

    "last-name-2": (field) =>
      validateRequiredText(field, "Vul een achternaam in."),

    location: (field) =>
      validateRequiredText(field, "Vul een vestigingsplaats in."),

    "date-testament": (field) =>
      validateDate(field, "Vul een geldige datum in."),

    "initials-3": validateInitials,

    "last-name-3": (field) =>
      validateRequiredText(field, "Vul een achternaam in."),

    "name-of-institution": (field) =>
      validateRequiredText(field, "Vul een geldige naam in."),

    street: (field) => validateRequiredText(field, "Vul een straatnaam in."),

    "house-number": (field) =>
      validateRequiredText(field, "Vul een huisnummer in."),

    "zip-code": validateDutchPostcode,

    "place-of-residence": (field) =>
      validateRequiredText(field, "Vul een woonplaats in."),

    "street-2": (field) =>
      validateRequiredText(field, "Vul een straatnaam in."),

    "house-number-2": (field) =>
      validateRequiredText(field, "Vul een huisnummer in."),

    "place-of-residence-2": (field) =>
      validateRequiredText(field, "Vul een plaats in."),

    email: validateEmail,

    "phone-number": validateOptionalTel,
  };

  /**************************************/
  /* MARK: VALIDATORS AAN VELDEN HANGEN */
  /**************************************/

  // Voor elk veld in de validator map:

  Object.entries(validators).forEach(([id, validator]) => {
    const field = $(id);
    if (!field) return;

    field.addEventListener("blur", () => {
      field.dataset.touched = "true";
      validator(field);
    });

    field.addEventListener("input", () => {
      const hasError = field.getAttribute("aria-invalid") === "true";
      const isTouched = field.dataset.touched === "true";

      if (isTouched && (hasError || shouldLiveValidate(field))) {
        validator(field);
      }
    });
  });

  /*******************************************/
  /* MARK: RADIO GROUPS AAN VALIDATIE HANGEN */
  /*******************************************/

  // Alle groepen die verplicht zijn
  const radioGroups = [
    "married",
    "conditions",
    "settlement-clause",
    "deceased-child",
    "passed-away-earlier",
    "children-of-children",
    "testament",
    "woonland",
  ];

  // Daarna koppel ik aan elke radio een change en blur
  // Zodra iemand radio button kiest of verlaat, wordt gecontroleerd of een keuze is gemaakt
  radioGroups.forEach((name) => {
    document
      .querySelectorAll(`input[type="radio"][name="${name}"]`)
      .forEach((radio) => {
        radio.addEventListener("change", () =>
          validateRadioGroup(name, "Maak een keuze."),
        );
        radio.addEventListener("blur", () =>
          validateRadioGroup(name, "Maak een keuze."),
        );
      });
  });

  /*******************************************************/
  /* MARK: CONDITIONELE BLOKKEN UPDATEN BIJ RADIO CHANGE */
  /*******************************************************/

  // Als iemand radio aanklikt: opnieuw kijken welke subvragen zichtbaar moeten zijn
  document.addEventListener("change", (e) => {
    if (e.target.matches('input[type="radio"]')) {
      updateConditionalVisibility();
    }
  });

  /*******************************/
  /* MARK: STARTSTATUS INSTELLEN */
  /*******************************/

  // Aan het einde van het laden startstatus instellen:

  // Alle fouten verborgen
  initFieldErrors();
  // Conditionele vragen correct zichtbaar
  updateConditionalVisibility();
  // '1 van 3' groep juist ingesteld
  validateAuthorizedGroup();

  /********************************/
  /* MARK: HERCONTROLE BIJ SUBMIT */
  /********************************/

  // Bij verzenden:
  if (form) {
    // Conditionele velden opnieuw goed zetten
    form.addEventListener("submit", (e) => {
      updateConditionalVisibility();

      // Alle gewone validators uitvoeren
      let isFormValid = true;

      Object.entries(validators).forEach(([id, validator]) => {
        const field = $(id);
        if (field && !validator(field)) isFormValid = false;
      });

      // Alle radio groepen controleren
      radioGroups.forEach((name) => {
        if (!validateRadioGroup(name, "Maak een keuze.")) {
          isFormValid = false;
        }
      });

      // de '1 van 3' groep controleren
      if (!validateAuthorizedGroup()) isFormValid = false;

      // De landkeuze controleren
      if (!validateCountry()) isFormValid = false;

      // Als één van die dingen fout is, wordt het formulier niet verstuurd
      if (!isFormValid) {
        e.preventDefault();
      }
    });
  }
});
