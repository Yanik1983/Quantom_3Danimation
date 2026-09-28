// Usage in EVAL: set the Nth range input (by accessible label) to a value, React-compatibly.
window.__setRange = (label, value) => {
  const input = [...document.querySelectorAll('input[type=range]')].find(
    (el) => document.querySelector(`label[for="${el.id}"]`)?.textContent === label,
  );
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, String(value));
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
