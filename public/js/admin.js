const deleteLinks = Array.from(document.getElementsByClassName('delete'));
const adminLinks = Array.from(document.getElementsByClassName('admin'));

for (const link of deleteLinks) {
  const url = link.dataset["url"];
  const confirmText = link.dataset["confirm"];
  if (!url || !confirmText || link.classList.contains('disabled')) continue;
  console.log(['delete', link])
  link.addEventListener('click', e => {
    e.preventDefault();
    if (!confirm(confirmText)) return;
    const req = new XMLHttpRequest();
    req.onreadystatechange = function() {
      if (req.readyState === XMLHttpRequest.DONE) location.reload();
    };
    req.open("DELETE", url, true);
    req.send();
  });
}

for (const link of adminLinks) {
  const url = link.dataset["url"];
  const admin = JSON.parse(link.dataset["admin"].toLowerCase());
  const confirmText = link.dataset["confirm"];
  if (!url || !confirmText) continue;
  console.log(['admin', link, admin])
  link.addEventListener('click', e => {
    e.preventDefault();
    if (!confirm(confirmText)) return;
    const xhttp = new XMLHttpRequest();
    xhttp.open("PUT", url);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState === XMLHttpRequest.DONE) location.reload();
    };
    xhttp.send(`admin=${!admin}`);
  });
}
