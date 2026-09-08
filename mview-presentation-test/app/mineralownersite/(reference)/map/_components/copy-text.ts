/*
 * Puts a value on the clipboard, by whichever route the browser allows.
 *
 * `navigator.clipboard` is the modern one and the only one worth using — but
 * it is undefined outside a secure context, which includes the app served over
 * plain http on a LAN address, and it rejects where the permission has been
 * refused. Both of those failed silently behind an optional call, so the
 * button looked broken rather than blocked.
 *
 * The fallback is the old selection trick. It is deprecated and it is also the
 * thing that still works in those two cases.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* Refused, or no permission here. Fall through and try the old way. */
  }

  try {
    const holder = document.createElement("textarea");
    holder.value = value;
    holder.setAttribute("readonly", "");
    /* Off-screen but selectable: `display:none` cannot be selected, and a
       visible box would scroll the page to itself. */
    holder.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
    document.body.appendChild(holder);
    holder.select();
    const done = document.execCommand("copy");
    holder.remove();
    return done;
  } catch {
    return false;
  }
}
