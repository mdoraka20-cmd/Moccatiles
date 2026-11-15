/**
 * Print-only helper using a dedicated #print-only-container in the DOM and native window.print().
 * Never downloads HTML files or shows PDF export controls.
 */

export const printHtmlContent = (contentHtml: string, title: string): { printed: boolean } => {
  const prevTitle = document.title;
  if (title) {
    document.title = title;
  }

  let container = document.getElementById('print-only-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'print-only-container';
    document.body.appendChild(container);
  }

  container.innerHTML = contentHtml;
  document.body.classList.add('printing-custom-doc');

  const cleanup = () => {
    document.body.classList.remove('printing-custom-doc');
    if (container) {
      container.innerHTML = '';
    }
    document.title = prevTitle;
  };

  window.addEventListener('afterprint', cleanup, { once: true });

  let printed = false;
  try {
    window.focus();
    window.print();
    printed = true;
  } catch {
    cleanup();
  }

  // Fallback cleanup if afterprint does not fire in a restricted sandbox
  setTimeout(cleanup, 60000);

  return { printed };
};

