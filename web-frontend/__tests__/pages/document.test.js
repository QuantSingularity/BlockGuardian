import { Children, isValidElement } from "react";
import Document from "../../pages/_document";

jest.mock("next/document", () => ({
  Html: function Html() {
    return null;
  },
  Head: function Head() {
    return null;
  },
  Main: function Main() {
    return null;
  },
  NextScript: function NextScript() {
    return null;
  },
}));

const { Head, Html, Main, NextScript } = jest.requireMock("next/document");

const collect = (node, predicate, found = []) => {
  if (!isValidElement(node)) return found;
  if (predicate(node)) found.push(node);
  Children.forEach(node.props.children, (child) =>
    collect(child, predicate, found),
  );
  return found;
};

const tree = () => Document();

const themeScript = () => {
  const [script] = collect(tree(), (n) => n.type === "script");
  return script.props.dangerouslySetInnerHTML.__html;
};

const runThemeScript = () => new Function(themeScript())();

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

describe("Document structure", () => {
  it("renders an English html root", () => {
    const root = tree();
    expect(root.type).toBe(Html);
    expect(root.props.lang).toBe("en");
  });

  it("includes the head, the main region and the framework scripts", () => {
    expect(collect(tree(), (n) => n.type === Head)).toHaveLength(1);
    expect(collect(tree(), (n) => n.type === Main)).toHaveLength(1);
    expect(collect(tree(), (n) => n.type === NextScript)).toHaveLength(1);
  });

  it("preconnects to the font hosts and loads the font stylesheet", () => {
    const links = collect(tree(), (n) => n.type === "link");
    const hrefs = links.map((l) => l.props.href);
    expect(hrefs).toContain("https://fonts.googleapis.com");
    expect(hrefs).toContain("https://fonts.gstatic.com");
    const sheet = links.find((l) => l.props.rel === "stylesheet");
    expect(sheet.props.href).toContain("family=Inter");
  });
});

describe("Document theme bootstrap script", () => {
  it("applies dark mode before paint when it was stored", () => {
    localStorage.setItem("bg_dark_mode", "true");
    runThemeScript();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("stays light when light mode was stored, even if the OS prefers dark", () => {
    localStorage.setItem("bg_dark_mode", "false");
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    runThemeScript();
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("follows the OS preference when nothing is stored", () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    runThemeScript();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("stays light when nothing is stored and the OS prefers light", () => {
    runThemeScript();
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("does not throw when storage is unavailable", () => {
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(() => runThemeScript()).not.toThrow();
    spy.mockRestore();
  });
});
