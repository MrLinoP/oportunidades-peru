import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FilterCategory } from "./filter-category";

afterEach(cleanup);

it("allows several filter categories to remain expanded simultaneously", () => {
  render(<><FilterCategory title="Objeto" count={0}>Tipos</FilterCategory><FilterCategory title="Región" count={0}>Regiones</FilterCategory></>);
  const object = screen.getByRole("button", { name: /Objeto/ });
  const region = screen.getByRole("button", { name: /Región/ });
  expect(object.getAttribute("aria-expanded")).toBe("false");
  expect(region.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(object);
  fireEvent.click(region);
  expect(object.getAttribute("aria-expanded")).toBe("true");
  expect(region.getAttribute("aria-expanded")).toBe("true");
});

it("preserves a selected option when its category closes and reopens", () => {
  render(<FilterCategory title="Objeto" count={1}><input type="checkbox" aria-label="Bien" /></FilterCategory>);
  const trigger = screen.getByRole("button", { name: /Objeto/ });
  fireEvent.click(trigger);
  const choice = screen.getByRole("checkbox", { name: "Bien" }) as HTMLInputElement;
  fireEvent.click(choice);
  expect(choice.checked).toBe(true);
  fireEvent.click(trigger);
  fireEvent.click(trigger);
  expect((screen.getByRole("checkbox", { name: "Bien" }) as HTMLInputElement).checked).toBe(true);
});