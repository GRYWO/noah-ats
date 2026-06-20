// Gedeelde diagnostiek + zichtbaar-veld-zoeker voor robin.mjs en jobdigger.mjs.

// Logt alle zichtbare invoervelden (placeholder/type/name) en maakt een
// screenshot. Zo zien we precies wat de bot op de pagina aantreft.
export async function diagnoseVelden(page, naam) {
  try {
    const velden = await page.evaluate(() =>
      [...document.querySelectorAll("input, textarea, [contenteditable='true']")]
        .filter((el) => el.offsetParent !== null) // alleen zichtbaar
        .map((el) => ({
          tag: el.tagName,
          type: el.type || "",
          placeholder: el.placeholder || "",
          name: el.name || "",
          aria: el.getAttribute("aria-label") || "",
        }))
        .slice(0, 25)
    );
    console.log(`[${naam}] zichtbare velden:`, JSON.stringify(velden));

    const knoppen = await page.evaluate(() =>
      [...document.querySelectorAll("button, input[type='submit'], [role='button']")]
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({
          tag: el.tagName,
          type: el.type || "",
          text: (el.textContent || "").trim().slice(0, 30),
          aria: el.getAttribute("aria-label") || "",
          title: el.getAttribute("title") || "",
          cls: (el.className || "").toString().slice(0, 50),
        }))
        .slice(0, 30)
    );
    console.log(`[${naam}] knoppen:`, JSON.stringify(knoppen));

    await page.screenshot({ path: `debug-${naam}.png`, fullPage: true }).catch(() => {});
    console.log(`[${naam}] screenshot opgeslagen: debug-${naam}.png`);
  } catch (e) {
    console.warn(`[${naam}] diagnostiek mislukt:`, e?.message || e);
  }
}

// Eerste ZICHTBARE veld dat op één van de selectors matcht.
export async function vindZichtbaarVeld(page, selectors) {
  for (const sel of selectors) {
    const loc = page.locator(`${sel}:visible`).first();
    if (await loc.count().catch(() => 0)) return loc;
  }
  return null;
}
