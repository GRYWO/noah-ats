// Globale aan/uit-knop voor de hele rondleiding-feature. Op true = niets
// wordt gerenderd. Code blijft staan om later weer aan te zetten.
export const TOUR_GEPARKEERD = true;

// Volgorde waarin de globale rondleiding de pagina's bezoekt.
// PaginaTour leest deze lijst om te bepalen wat de "volgende pagina" is.
export const RONDLEIDING_PADEN = [
  "/dashboard",
  "/kandidaten",
  "/kanban",
  "/agenda",
  "/voorstellen",
  "/opdrachtgevers",
  "/jobdigger",
  "/coaching",
  "/users",
];

export const RONDLEIDING_KEY = "noah-rondleiding-actief";
export const TOUR_GEZIEN_KEY = "noah-tour-gezien";
