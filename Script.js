document.addEventListener("DOMContentLoaded", () => {
  const resetField = (el) => {
    if (el.type === "radio" || el.type === "checkbox") {
      el.checked = false;
    } else if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else {
      el.value = "";
    }
  };

  const updateVisibility = () => {
    document
      .querySelectorAll(".conditional[data-show-when]")
      .forEach((block) => {
        const [groupName, requiredValue] = block.dataset.showWhen.split(":");

        const checked = document.querySelector(
          `input[type="radio"][name="${groupName}"]:checked`,
        );

        const shouldShow = checked?.value === requiredValue;

        block.classList.toggle("is-visible", shouldShow);

        block.querySelectorAll("input, select, textarea").forEach((el) => {
          el.disabled = !shouldShow;
          if (!shouldShow) resetField(el);
        });
      });
  };

  document.addEventListener("change", (e) => {
    if (e.target.matches('input[type="radio"]')) {
      updateVisibility();
    }
  });

  updateVisibility();

  /* DATE OF DEATH */
  const dateOfDeathInput = document.getElementById("date-of-death");

  if (dateOfDeathInput) {
    const today = new Date();
    const past = new Date();
    past.setMonth(today.getMonth() - 20);

    dateOfDeathInput.max = today.toISOString().split("T")[0];
    dateOfDeathInput.min = past.toISOString().split("T")[0];
  }

  /* 1 OF 3 VALIDITY + DISABLE OTHERS */
  const fields = [
    document.getElementById("bsn-authorized-person"),
    document.getElementById("beconnumber"),
    document.getElementById("protocolnumber-authorized-person"),
  ].filter(Boolean);

  const error = document.getElementById("authorized-person-error");
  const resetButton = document.getElementById("reset-fields");

  function validateGroup() {
    const filledField = fields.find((field) => field.value.trim() !== "");
    const oneFilled = Boolean(filledField);

    fields.forEach((field) => {
      field.disabled = oneFilled && field !== filledField;
      field.setCustomValidity(
        oneFilled ? "" : "Vul minimaal 1 van deze 3 velden in.",
      );
    });

    if (error) {
      error.hidden = oneFilled;
    }
  }

  fields.forEach((field) => {
    field.addEventListener("input", validateGroup);
  });

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      fields.forEach((field) => {
        field.value = "";
        field.disabled = false;
        field.setCustomValidity("");
      });

      if (error) {
        error.hidden = true;
      }
    });
  }

  validateGroup();
});

// COUNTRY LIST AND VALIDATOR

const countries = [
  { code: "AFG", name: "Afghanistan" },
  { code: "ALB", name: "Albanië" },
  { code: "DZA", name: "Algerije" },
  { code: "AND", name: "Andorra" },
  { code: "ARG", name: "Argentinië" },
  { code: "AUS", name: "Australië" },
  { code: "AUT", name: "Oostenrijk" },
  { code: "BEL", name: "België" },
  { code: "BRA", name: "Brazilië" },
  { code: "CAN", name: "Canada" },
  { code: "CHE", name: "Zwitserland" },
  { code: "CHN", name: "China" },
  { code: "DEU", name: "Duitsland" },
  { code: "DNK", name: "Denemarken" },
  { code: "ESP", name: "Spanje" },
  { code: "FIN", name: "Finland" },
  { code: "FRA", name: "Frankrijk" },
  { code: "GBR", name: "Verenigd Koninkrijk" },
  { code: "IND", name: "India" },
  { code: "ITA", name: "Italië" },
  { code: "JPN", name: "Japan" },
  { code: "MAR", name: "Marokko" },
  { code: "NLD", name: "Nederland" },
  { code: "NOR", name: "Noorwegen" },
  { code: "POL", name: "Polen" },
  { code: "PRT", name: "Portugal" },
  { code: "SWE", name: "Zweden" },
  { code: "TUR", name: "Turkije" },
  { code: "USA", name: "Verenigde Staten" },
  { code: "XXX", name: "Onbekend / niet in lijst" },
];

const input = document.getElementById("country-input");
const hidden = document.getElementById("country-code");
const datalist = document.getElementById("country-codes");
const error = document.getElementById("country-code-error");

countries.forEach((country) => {
  const option = document.createElement("option");
  option.value = `${country.code} ${country.name}`;
  datalist.appendChild(option);
});

function normalize(value) {
  return value.trim().toLowerCase();
}

function findCountry(value) {
  const normalized = normalize(value);

  return countries.find((country) => {
    return (
      normalize(country.code) === normalized ||
      normalize(country.name) === normalized ||
      normalize(`${country.code} ${country.name}`) === normalized
    );
  });
}

function validateCountryInput() {
  const match = findCountry(input.value);

  if (match) {
    input.value = match.name;   // zichtbaar veld = landnaam
    hidden.value = match.code;  // opgeslagen waarde = landcode
    input.setCustomValidity("");
    error.hidden = true;
  } else if (input.value.trim() !== "") {
    hidden.value = "";
    input.setCustomValidity("Ongeldige landcode of landnaam.");
    error.hidden = false;
  } else {
    hidden.value = "";
    input.setCustomValidity("");
    error.hidden = true;
  }
}

input.addEventListener("change", validateCountryInput);
input.addEventListener("blur", validateCountryInput);

input.addEventListener("input", () => {
  hidden.value = "";
  input.setCustomValidity("");
  error.hidden = true;
});
