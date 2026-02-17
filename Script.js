/*******************************************/
/* MARK: HIDE / SHOW CONDITIONAL QUESTIONS */
/*******************************************/

document.addEventListener("DOMContentLoaded", () => {
  const conditionals = document.querySelectorAll(
    ".conditional[data-show-when]",
  );

  function updateVisibility() {
    conditionals.forEach((block) => {
      const rule = block.dataset.showWhen; // bijv "married:yes"
      const [groupName, requiredValue] = rule.split(":");

      const checked = document.querySelector(
        `input[type="radio"][name="${groupName}"]:checked`,
      );
      const shouldShow = checked?.value === requiredValue;

      block.classList.toggle("is-visible", shouldShow);

      block.querySelectorAll("input, select, textarea").forEach((el) => {
        el.disabled = !shouldShow;

        if (!shouldShow) {
          // Reset values ​​so that they are actually gone
          if (el.type === "radio" || el.type === "checkbox") {
            el.checked = false;
          } else if (el.tagName === "SELECT") {
            el.selectedIndex = 0;
          } else {
            el.value = "";
          }
        }
      });
    });
  }

  // Listen to changes on all radios
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", updateVisibility);
  });

  // Put it right the first time when opening
  updateVisibility();
});
