document.addEventListener('DOMContentLoaded', () => {
  // Update footer copyright year
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});
