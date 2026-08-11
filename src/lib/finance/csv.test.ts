import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/finance/csv";

const withoutBom = (value: string) => value.replace(/^﻿/, "");

describe("toCsv", () => {
  it("antepone el BOM para que Excel respete las tildes", () => {
    expect(toCsv([["Descripción"]]).startsWith("﻿")).toBe(true);
  });

  it("entrecomilla los valores con comas, comillas o saltos de línea", () => {
    const csv = withoutBom(toCsv([["Pago, adelanto", 'Dijo "listo"', "linea1\nlinea2"]]));
    expect(csv).toBe('"Pago, adelanto","Dijo ""listo""","linea1\nlinea2"');
  });

  it("neutraliza los textos que Excel interpretaría como fórmula", () => {
    expect(withoutBom(toCsv([["=1+1", "+34", "@nombre"]]))).toBe("'=1+1,'+34,'@nombre");
  });

  it("escribe los números negativos como cifras, no como texto", () => {
    expect(withoutBom(toCsv([[-15000, 0, 27000.5]]))).toBe("-15000,0,27000.5");
  });

  it("deja vacías las celdas nulas y no toca los números", () => {
    expect(withoutBom(toCsv([[null, undefined, 18000, ""]]))).toBe(",,18000,");
  });

  it("separa las filas con CRLF", () => {
    expect(withoutBom(toCsv([["a"], ["b"]]))).toBe("a\r\nb");
  });
});
