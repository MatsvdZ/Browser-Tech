// HTML krijgt JS class om anders te stijlen met en zonder JS
document.documentElement.classList.add("js");

// BRONNEN:
// https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/DOM_scripting
// https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement

// BRON: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
document.addEventListener("DOMContentLoaded", () => {
  // Als JS laad, geef de form dan novalidate en haalt standaard browser error weg.
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
  const $ = (id) => document.getElementById(id); // helper

  // Initialiseer alle errors
  function initFieldErrors() {
    // Verstop alle errors tijdens het laden
    document.querySelectorAll(".error").forEach((el) => {
      el.hidden = true;
    });

    // Maakt alle velden 'nog niet invalid'
    document.querySelectorAll("input, select, textarea").forEach((field) => {
      // BRON: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid
      field.removeAttribute("aria-invalid");
    });
  }

  /********************************************/
  /* MARK: ERRORS BIJ VELD TONEN OF VERBERGEN */
  /********************************************/

  // Zet custom validity op het veld
  function setFieldError(field, message = "") {
    if (!field) return; // als het veld niet bestaat, stop

    // Native browser validatie instellen
    // BRON: Workshop victor voor custom validation
    field.setCustomValidity(message); // Als message leeg is, veld is geldig. Wel tekst dus ongeldig
    field.setAttribute("aria-invalid", message ? "true" : "false"); // Zet aria-invalid op true of false voor screenreaders

    // Zoekt de gekoppelde .error via aria-describedby
    const errorId = (field.getAttribute("aria-describedby") || "")
      .split(" ") // omdat je meerdere ID's kunt hebben
      .find(
        (id) => id.endsWith("-error") && id !== "authorized-person-group-error", // sluit deze groepserror uit, behandel ik apart
      );

    // Toont of verbergt die foutmelding
    const errorEl = errorId ? $(errorId) : null; // $ is dus de helper die ik eerder gemaakt heb

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
    const errorEl = $(id); // Zoekt het error element, bijv: <p id="married-error"></p>
    if (!errorEl) return;

    errorEl.textContent = message; // Zet de error message
    errorEl.hidden = !message;
  }

  // Maakt een veld leeg op uncheckt een radio
  // Wist ook foutmelding
  function resetField(field) {
    if (field.type === "radio") {
      field.checked = false;
    } else {
      field.value = ""; // input leegmaken
    }

    field.setCustomValidity(""); // veld weer geldig maken
    field.setAttribute("aria-invalid", "false"); // visuele state reset, haalt dus rode border weg
  }

  // Zoek welke radio met dezelfde name is aangeklikt en geef de value terug
  // bijv: name="married" dan is gekozen waarde: ="yes"
  function getRadioValue(name) {
    return (
      document.querySelector(`input[type="radio"][name="${name}"]:checked`) // Zoekt radio met juiste naam die checked is
        ?.value ?? null
    );
  }

  /***************************************/
  /* MARK: CONDITIONALE VRAGEN SHOW/HIDE */
  /***************************************/
  // Zorgt ervoor de de vragen standaard verstopt zijn en pas zichtbaar worden wanneer een radio input hier om vraagt
  function updateConditionalVisibility() {
    // loop door alle conditionele blokken
    conditionalBlocks.forEach((block) => {
      // lees de voorwaarde uit HTML, bijv: data-show-when="married:yes"
      const [fieldName, rawValues] = block.dataset.showWhen.trim().split(":");
      if (!fieldName || !rawValues) return;

      // pak de gekozen radio waarde
      const shouldShow = rawValues
        .split(",")
        .map((value) => value.trim())
        .includes(getRadioValue(fieldName));

      // toont of verbergt het blok als shouldShow = true en anders display: none
      block.classList.toggle("is-visible", shouldShow);

      // voor alle inputs in dat blok:
      block.querySelectorAll("input, select, textarea").forEach((field) => {
        // Als blok zichtbaar is, field.disabled = false
        field.disabled = !shouldShow;

        // Als blok verborgen is, wis waarde, verwijder validatie, gebruiker kan niks meer met dat blok
        // Dit voorkomt bugs bij submit
        if (!shouldShow) {
          resetField(field);
          field.removeAttribute("required");
          // Alleen velden met data-required-when-visible krijgen required
        } else if (field.dataset.requiredWhenVisible !== undefined) {
          field.setAttribute("required", "");
        }
      });
      // Alle foutmeldingen resetten zodat blok leeg opent
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

    // Postcode alleen live valideren vanaf 1234AB, spatie telt niet mee
    if (field.id === "zip-code" || field.id === "zip-code-2") {
      return value.replace(/\s/g, "").length >= 6;
    }

    // Email alleen live valideren zodra er een @ in staat
    if (field.id === "email") {
      return value.includes("@");
    }

    return false;
  }

  /************************/
  /* MARK: BASISVALIDATIE */
  /************************/

  // Controleert of het veld actief is
  function validateRequiredText(field, message) {
    // checkt of het veld actief is
    // Als veld disabled is, geen foutmelding
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    // Controleert of het veld verplicht is
    if (field.required && isEmpty(field.value)) {
      setFieldError(field, message);
      // Als field required EN leeg is, fout
      return false;
    }

    // Geen problemen? verwijder foutmelding
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
    // is het veld actief? als veld dissabled is, geen error
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }
    // Haalt inut op zonder spaties voor/achter
    const value = field.value.trim();

    // Als het verplicht en leeg is, toon requiredMessage
    if (field.required && isEmpty(value)) {
      setFieldError(field, requiredMessage);
      return false;
    }

    // Als ingevuld is, maar regex is fout, stuur invalidMessage
    if (!isEmpty(value) && !pattern.test(value)) {
      setFieldError(field, invalidMessage);
      return false;
    }

    // Anders, veld is geldig
    setFieldError(field, "");
    return true;
  }

  /*********************************/
  /* MARK: NORMALIZERS VOOR VELDEN */
  /*********************************/
  // Meerdere manieren van initialen accepteren: J.P. of jp of j p ect
  function normalizeInitials(value) {
    return value
      .replace(/[^a-zA-Z]/g, "") // verwijder alles behalve letters
      .toUpperCase() // maak hoofdletters
      .split("") // split in letters ["J", "P"]
      .slice(0, 10) // max 10 letters
      .map((l) => l + ".") // voeg punt toe
      .join(""); // voeg samen
  }
  // Nederlandse postcode normalisatie
  function normalizePostcode(value) {
    const cleaned = value.replace(/\s+/g, "").toUpperCase(); // verwijder spaties + hoofdletters

    if (cleaned.length <= 4) return cleaned; // eerste deel (1234)
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)}`; // maakt 1234ab naar 1234 AB
  }
  // BSN normalisatie
  function normalizeBsn(value) {
    return value.replace(/\D/g, ""); // verwijdert alles behalve cijfers
  }

  // De functies hieronder gebruiken validatePattern of eigen logica:
  // Voorletters, controleert formaat zoals M. of M.M.
  function validateInitials(field) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    const value = field.value.trim();

    if (field.required && isEmpty(value)) {
      setFieldError(field, "Vul uw voorletter(s) in.");
      return false;
    }
    // wel iets ingevuld maar voldoet niet aan formaat, error
    if (!isEmpty(value) && !/^([A-Z]\.){1,10}$/.test(value)) {
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

  // controleert Nederlandse postcode
  function validateDutchPostcode(field) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    if (field.required && isEmpty(field.value)) {
      setFieldError(field, "Vul een postcode in.");
      return false;
    }

    // fix invoer automatisch
    field.value = normalizePostcode(field.value);

    // regex check
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

  // Kijkt of er binnen radio group een keuze is gemaakt, anders foutmelding
  function validateRadioGroup(name, message) {
    // Zoek alle radio's van de groep, bijvoorbeeld "married" zoekt naar die input
    const radios = document.querySelectorAll(
      `input[type="radio"][name="${name}"]`,
    );
    // geen radio's? stop, als groep niet bestaat, gewoon geldig
    if (!radios.length) return true;

    // Verborgen vragen, disabled, worder genegeerd
    const activeRadios = [...radios].filter((radio) => !radio.disabled);
    // vraag is verborgen, geen validatie nodig
    if (!activeRadios.length) {
      setGroupError(`${name}-error`, "");
      return true;
    }

    // niks gekozen = false, iets gekozen = true
    const checked = activeRadios.some((radio) => radio.checked);

    // Als er wel een keuze is gemaakt, wordt error weggehaald
    activeRadios.forEach((radio, index) => {
      radio.setAttribute("aria-invalid", checked ? "false" : "true");
      radio.setCustomValidity(index === 0 && !checked ? message : "");
    });

    // checked = true geen teks, false is error
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
  // BRON: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
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
    // verwijder datalist uit HTML als js is geladen
    datalist.innerHTML = "";

    //maak eigen datalist aan a.d.h.v. array
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

  // Kijkt of het veld actief is en bestaat
  function validateCountry() {
    if (!countryInput || !countryHidden || !isActiveField(countryInput)) {
      setFieldError(countryInput, "");
      return true;
    }

    // haal waarde op die gebruiker heeft ingevuld
    const value = countryInput.value.trim();

    // Checkt of het verplicht en leeg is
    if (countryInput.required && isEmpty(value)) {
      countryHidden.value = "";
      setFieldError(countryInput, "Vul een land in.");
      return false;
    }

    // leeg maar niet verplicht, gewoon toegestaan
    if (isEmpty(value)) {
      countryHidden.value = "";
      setFieldError(countryInput, "");
      return true;
    }

    // Zoekt of invoer overeenkomt met land of landcode
    const match = countries.find((country) => {
      // vergelijkt dus landcode en landnaam, bijv: NLD Nederland
      const full = `${country.code} ${country.name}`;
      // Gebruiker kan landcode of landnaam invoeren en dat werkt allemaal
      return (
        normalize(country.code) === normalize(value) ||
        normalize(country.name) === normalize(value) ||
        normalize(full) === normalize(value)
      );
    });

    // bij geen match, foutmelding
    if (!match) {
      countryHidden.value = "";
      // geen match is foutmelding tonen
      setFieldError(countryInput, "Kies een geldig land uit de lijst.");
      return false;
    }
    // wel match, landcode opslaan
    countryInput.value = match.name;
    countryHidden.value = match.code;
    setFieldError(countryInput, "");
    return true;
  }

  if (countryInput) {
    // bij selectie uit datalist
    // BRON: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event
    countryInput.addEventListener("change", validateCountry);
    // wanneer gebruiker het veld verlaat
    // BRON: https://developer.mozilla.org/en-US/docs/Web/API/Element/blur_event
    countryInput.addEventListener("blur", validateCountry);
    // tijdens typen wordt hidden waarde gewist, en error verdwijnt
    countryInput.addEventListener("input", () => {
      if (countryHidden) countryHidden.value = "";
      setFieldError(countryInput, "");
    });
  }

  /***********************************/
  /* MARK: "1 VAN 3" GROEP VALIDATIE */
  /***********************************/

  // pakt velden voor bsn, beconnummer en protocolnummer
  const authorizedFields = [
    $("bsn-authorized-person"),
    $("beconnumber"),
    $("protocolnumber-authorized-person"),
    // haalt null eruit
  ].filter(Boolean);

  // Kijk of 1 van de 3 is ingevuld
  function validateAuthorizedGroup() {
    // geen velden? stop
    if (!authorizedFields.length) return true;
    // Zoek welk veld is ingevuld
    const filledField = authorizedFields.find((field) => !isEmpty(field.value));

    // Zodra een veld is ingevuld, andere velden dissabelen
    authorizedFields.forEach((field) => {
      field.disabled = !!filledField && field !== filledField;
    });

    // Als geen veld is gevuld, groepsfout tonen
    if (!filledField) {
      // individuele fouten weg, alleen groepsfout tonen
      authorizedFields.forEach((field) => {
        setFieldError(field, "");
      });

      setGroupError(
        "authorized-person-group-error",
        "Vul 1 van deze 3 velden in.",
      );

      return false;
    }

    // wel veld ingevuld, geen groepsfout
    setGroupError("authorized-person-group-error", "");

    // voorkomt dat disabled velden rood blijven
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

  // markeert het veld als 'aangeraakt' en start validatie
  authorizedFields.forEach((field) => {
    field.addEventListener("blur", () => {
      field.dataset.touched = "true";
      validateAuthorizedGroup();
    });

    // Nog niet aangeraakt = geen live validatie
    // wel aangeraakt = wel live validatie
    field.addEventListener("input", () => {
      const isTouched = field.dataset.touched === "true";
      const hasError = field.getAttribute("aria-invalid") === "true";

      // error aanwezig = direct opnieuw checken
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
  // loop door alle validators
  Object.entries(validators).forEach(([id, validator]) => {
    // pak het veld uit de DOM
    const field = $(id);
    if (!field) return;

    // gebeurt als gebruiker het veld verlaat
    field.addEventListener("blur", () => {
      // markeert veld als touched, dan mag live validatie
      field.dataset.touched = "true";

      // initialen
      if (id === "initials" || id === "initial-2" || id === "initials-3") {
        field.value = normalizeInitials(field.value);
      }
      // roept de juiste functie aan: validateInitials
      validator(field);
    });
    // live validatie gebeurt bij elke toets
    field.addEventListener("input", () => {
      // check status
      const hasError = field.getAttribute("aria-invalid") === "true";
      const isTouched = field.dataset.touched === "true";
      // Alleen live validatie als gebruiker klaar is met veld (blur) EN er was al een fout of er is genoeg input
      if (isTouched && (hasError || shouldLiveValidate(field))) {
        // valideer
        validator(field);
      }
    });
  });

  /**************************/
  /* MARK: NORMALIZE INPUTS */
  /**************************/

  // BSN alleen cijfers laten tijdens typen
  ["bsn", "bsn-authorized-person"].forEach((id) => {
    const field = $(id);
    if (!field) return;
    // bij elke toets, alles behalve cijfers verwijderen
    field.addEventListener("input", () => {
      field.value = normalizeBsn(field.value);
    });
  });

  // Nederlandse postcode automatisch formatteren
  ["zip-code"].forEach((id) => {
    const field = $(id);
    if (!field) return;
    // tijdens typen spaties weg, hoofdletters en juiste format
    field.addEventListener("input", () => {
      field.value = normalizePostcode(field.value);
    });
  });

  /*******************************************/
  /* MARK: RADIO GROUPS AAN VALIDATIE HANGEN */
  /*******************************************/

  // Lijst met radio groepen
  // dit zijn alle name ittributen van mijn radio inputs
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

  // Voor elke groep (bijv. "married")
  radioGroups.forEach((name) => {
    // zoek alle radio buttons in die groep
    document
      .querySelectorAll(`input[type="radio"][name="${name}"]`)
      // voor elke individuele radio button
      .forEach((radio) => {
        // gebeurt wanneer gebruiker een optie aanklikt
        radio.addEventListener("change", () =>
          validateRadioGroup(name, "Maak een keuze."),
        );
        // gebeurt wanneer gebruiker radio verlaat door te tabben of ergens anders te klikken
        radio.addEventListener("blur", () =>
          validateRadioGroup(name, "Maak een keuze."),
        );
      });
  });

  /*******************************************************/
  /* MARK: CONDITIONELE BLOKKEN UPDATEN BIJ RADIO CHANGE */
  /*******************************************************/

  // Als iemand radio aanklikt: opnieuw kijken welke subvragen zichtbaar moeten zijn
  // globale listener, luistert naar elke change in het document
  document.addEventListener("change", (e) => {
    // checkt of het een radiobutton is
    // e.target = het element dat veranderd is
    if (e.target.matches('input[type="radio"]')) {
      // roept functie aan. Kijkt welke radio gekozen is en bepaalt welke blokken zichtbaar worden
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
    // luister naar submit, gebeurt wanneer gebruiker op 'verzenden' klikt
    form.addEventListener("submit", (e) => {
      // zorgt dat alleen zichtbare velden actief zijn en hidden velden genegeerd worden
      updateConditionalVisibility();

      // uitganspunt. alles oke, tenzij er fouten worden gevonden
      let isFormValid = true;

      // voor elk veld, voer validator uit, als fout, isFormValid = false
      Object.entries(validators).forEach(([id, validator]) => {
        const field = $(id);
        if (field && !validator(field)) isFormValid = false;
      });

      // Alle radio groepen controleren, heeft gebruiker overal een keuze gemaakt?
      radioGroups.forEach((name) => {
        if (!validateRadioGroup(name, "Maak een keuze.")) {
          isFormValid = false;
        }
      });

      // de '1 van 3' groep controleren, is er minstens 1 ingevuld?
      if (!validateAuthorizedGroup()) isFormValid = false;

      // De landkeuze controleren, bestaat het land? is het correct gekozen
      if (!validateCountry()) isFormValid = false;

      // Als één van die dingen fout is, wordt het formulier niet verstuurd
      if (!isFormValid) {
        e.preventDefault();
      }
    });
  }
});
