document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  if (form) {
    form.setAttribute("novalidate", "");
  }

  const conditionalBlocks = document.querySelectorAll(
    ".conditional[data-show-when]",
  );

  const isEmpty = (value) => value.trim() === "";
  const isActiveField = (field) => field && !field.disabled;
  const $ = (id) => document.getElementById(id);

  function initFieldErrors() {
    document.querySelectorAll(".error").forEach((el) => {
      el.hidden = true;
    });

    document.querySelectorAll("input, select, textarea").forEach((field) => {
      field.setAttribute("aria-invalid", "false");
    });
  }

  function setFieldError(field, message = "") {
    if (!field) return;

    field.setCustomValidity(message);
    field.setAttribute("aria-invalid", message ? "true" : "false");

    const errorId = (field.getAttribute("aria-describedby") || "")
      .split(" ")
      .find(
        (id) => id.endsWith("-error") && id !== "authorized-person-group-error",
      );

    const errorEl = errorId ? $(errorId) : null;

    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = !message;
    }
  }

  function setGroupError(id, message = "") {
    const errorEl = $(id);
    if (!errorEl) return;

    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function resetField(field) {
    if (field.type === "radio") {
      field.checked = false;
    } else {
      field.value = "";
    }

    field.setCustomValidity("");
    field.setAttribute("aria-invalid", "false");
  }

  function getRadioValue(name) {
    return (
      document.querySelector(`input[type="radio"][name="${name}"]:checked`)
        ?.value ?? null
    );
  }

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

  function validateRequiredText(field, message) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    if (field.required && isEmpty(field.value)) {
      setFieldError(field, message);
      return false;
    }

    setFieldError(field, "");
    return true;
  }

  function validatePattern(
    field,
    { requiredMessage, invalidMessage, pattern },
  ) {
    if (!isActiveField(field)) {
      setFieldError(field, "");
      return true;
    }

    const value = field.value.trim();

    if (field.required && isEmpty(value)) {
      setFieldError(field, requiredMessage);
      return false;
    }

    if (!isEmpty(value) && !pattern.test(value)) {
      setFieldError(field, invalidMessage);
      return false;
    }

    setFieldError(field, "");
    return true;
  }

  function validateInitials(field) {
    return validatePattern(field, {
      requiredMessage: "Vul uw voorletter(s) in.",
      invalidMessage: "Vul geldige voorletters in, bijvoorbeeld J. of J.P.",
      pattern: /^([A-Z]\.\s*){1,3}$/,
    });
  }

  function validateBsn(field) {
    return validatePattern(field, {
      requiredMessage: "Vul het BSN in.",
      invalidMessage: "Een BSN of RSIN moet uit 8 of 9 cijfers bestaan.",
      pattern: /^\d{8,9}$/,
    });
  }

  function validateBecon(field) {
    return validatePattern(field, {
      requiredMessage: "Vul het beconnummer in.",
      invalidMessage: "Een beconnummer moet uit 7 cijfers bestaan.",
      pattern: /^\d{7}$/,
    });
  }

  function validateProtocol(field) {
    return validatePattern(field, {
      requiredMessage: "Vul het protocolnummer in.",
      invalidMessage: "Een protocolnummer moet uit 6 cijfers bestaan.",
      pattern: /^\d{6}$/,
    });
  }

  function validatePostcode(field) {
    return validatePattern(field, {
      requiredMessage: "Vul een postcode in.",
      invalidMessage: "Vul een geldige postcode in, bijvoorbeeld 1234 AB.",
      pattern: /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/,
    });
  }

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

  function validateRadioGroup(name, message) {
    const radios = document.querySelectorAll(
      `input[type="radio"][name="${name}"]`,
    );
    if (!radios.length) return true;

    const activeRadios = [...radios].filter((radio) => !radio.disabled);
    if (!activeRadios.length) {
      setGroupError(`${name}-error`, "");
      return true;
    }

    const checked = activeRadios.some((radio) => radio.checked);

    activeRadios.forEach((radio, index) => {
      radio.setAttribute("aria-invalid", checked ? "false" : "true");
      radio.setCustomValidity(index === 0 && !checked ? message : "");
    });

    setGroupError(`${name}-error`, checked ? "" : message);
    return checked;
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const dateOfDeath = $("date-of-death");
  if (dateOfDeath) {
    const past = new Date(today);
    past.setMonth(today.getMonth() - 20);

    dateOfDeath.max = todayStr;
    dateOfDeath.min = past.toISOString().split("T")[0];
  }

  ["conditions-date", "date-testament"].forEach((id) => {
    const field = $(id);
    if (field) field.max = todayStr;
  });

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

  if (countryInput && countryHidden && datalist) {
    countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = `${country.code} ${country.name}`;
      datalist.appendChild(option);
    });
  }

  const normalize = (value) => value.trim().toLowerCase();

  function validateCountry() {
    if (!countryInput || !countryHidden || !isActiveField(countryInput)) {
      setFieldError(countryInput, "");
      return true;
    }

    const value = countryInput.value.trim();

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

    const match = countries.find((country) => {
      const full = `${country.code} ${country.name}`;
      return (
        normalize(country.code) === normalize(value) ||
        normalize(country.name) === normalize(value) ||
        normalize(full) === normalize(value)
      );
    });

    if (!match) {
      countryHidden.value = "";
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

  const authorizedFields = [
    $("bsn-authorized-person"),
    $("beconnumber"),
    $("protocolnumber-authorized-person"),
  ].filter(Boolean);

  function validateAuthorizedGroup() {
    if (!authorizedFields.length) return true;

    const filledField = authorizedFields.find((field) => !isEmpty(field.value));

    authorizedFields.forEach((field) => {
      field.disabled = !!filledField && field !== filledField;
    });

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

    if (filledField.id === "bsn-authorized-person") {
      return validateBsn(filledField);
    }

    if (filledField.id === "beconnumber") {
      return validateBecon(filledField);
    }

    return validateProtocol(filledField);
  }

  authorizedFields.forEach((field) => {
    field.addEventListener("input", validateAuthorizedGroup);
    field.addEventListener("blur", validateAuthorizedGroup);
  });

  const resetBtn = $("reset-fields");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      authorizedFields.forEach((field) => {
        field.value = "";
        field.disabled = false;
        setFieldError(field, "");
      });
      setGroupError("authorized-person-group-error", "");
    });
  }

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
    "zip-code": validatePostcode,
    "place-of-residence": (field) =>
      validateRequiredText(field, "Vul een woonplaats in."),
    "street-2": (field) =>
      validateRequiredText(field, "Vul een straatnaam in."),
    "house-number-2": (field) =>
      validateRequiredText(field, "Vul een huisnummer in."),
    "zip-code-2": validatePostcode,
    "place-of-residence-2": (field) =>
      validateRequiredText(field, "Vul een plaats in."),
    email: validateEmail,
    "phone-number": validateOptionalTel,
  };

  Object.entries(validators).forEach(([id, validator]) => {
    const field = $(id);
    if (!field) return;

    field.addEventListener("blur", () => validator(field));
    field.addEventListener("input", () => validator(field));
  });

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

  document.addEventListener("change", (e) => {
    if (e.target.matches('input[type="radio"]')) {
      updateConditionalVisibility();
    }
  });

  initFieldErrors();
  updateConditionalVisibility();
  validateAuthorizedGroup();

  if (form) {
    form.addEventListener("submit", (e) => {
      updateConditionalVisibility();

      let isFormValid = true;

      Object.entries(validators).forEach(([id, validator]) => {
        const field = $(id);
        if (field && !validator(field)) isFormValid = false;
      });

      radioGroups.forEach((name) => {
        if (!validateRadioGroup(name, "Maak een keuze.")) {
          isFormValid = false;
        }
      });

      if (!validateAuthorizedGroup()) isFormValid = false;
      if (!validateCountry()) isFormValid = false;

      if (!isFormValid) {
        e.preventDefault();
      }
    });
  }
});
