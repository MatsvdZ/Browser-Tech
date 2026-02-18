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

  // Eén listener via event delegation
  document.addEventListener("change", (e) => {
    if (e.target.matches('input[type="radio"]')) {
      updateVisibility();
    }
  });

  updateVisibility(); // Init bij laden
});
