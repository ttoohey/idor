import idor from "../src";

test("Can create an obfuscated ID", () => {
  const Idor = idor({ salt: "secret" });
  const received = new Idor(1, "User").toString();
  const expected = "7Xb1vhHJpWvaDUXl+tRluA";
  expect(received).toEqual(expected);
});

test("Type produces different strings", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    new Idor(1, "User").toString(),
    new Idor(1, "Post").toString()
  ];
  const expected = ["7Xb1vhHJpWvaDUXl+tRluA", "6PyZcANIhp1O/ydFDXHtsQ"];
  expect(received).toMatchObject(expected);
});

test("Value produces different strings", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    new Idor(1, "User").toString(),
    new Idor(2, "User").toString()
  ];
  const expected = ["7Xb1vhHJpWvaDUXl+tRluA", "hTAOWGzEEbUuCzTNVsL4dQ"];
  expect(received).toMatchObject(expected);
});

test("Accepts UUID values", () => {
  const Idor = idor({ salt: "secret" });
  const received = new Idor(
    "123e4567-e89b-12d3-a456-426655440000",
    "User"
  ).toString();
  const expected = "rfMD8jH0/sw4CFucgik+Yn8UStRYB/Mb7c8S770rpTc";
  expect(received).toEqual(expected);
});

test("Can be used with different scopes", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    new Idor(1, "User", "public").toString(),
    new Idor(1, "User", "private").toString()
  ];
  const expected = ["7Xb1vhHJpWvaDUXl+tRluA", "VgC9h2T/L6HgnQzCfftsBw"];
  expect(received).toEqual(expected);
});

test("Can parse an obfuscated ID", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    Idor.fromString("7Xb1vhHJpWvaDUXl+tRluA").valueOf(),
    Idor.fromString("7Xb1vhHJpWvaDUXl+tRluA").typename
  ];
  const expected = [1, "User"];
  expect(received).toMatchObject(expected);
});

test("Can parse a scoped obfuscated ID ", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    Idor.fromString("VgC9h2T/L6HgnQzCfftsBw", "private").valueOf(),
    Idor.fromString("VgC9h2T/L6HgnQzCfftsBw", "private").typename
  ];
  const expected = [1, "User"];
  expect(received).toMatchObject(expected);
});

test("Can parse an obfuscated UUID", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    Idor.fromString("rfMD8jH0/sw4CFucgik+Yn8UStRYB/Mb7c8S770rpTc").valueOf(),
    Idor.fromString("rfMD8jH0/sw4CFucgik+Yn8UStRYB/Mb7c8S770rpTc").typename
  ];
  const expected = ["123e4567-e89b-12d3-a456-426655440000", "User"];
  expect(received).toMatchObject(expected);
});

test("Different salts produces different obfuscated IDs", () => {
  const Idor1 = idor({ salt: "secret" });
  const Idor2 = idor({ salt: "S3cr3t" });
  const received = [
    new Idor1(1, "User").toString(),
    new Idor2(1, "User").toString()
  ];
  const expected = ["7Xb1vhHJpWvaDUXl+tRluA", "qz5Rsa0czB+vsbwc0qjUcw"];
  expect(received).toEqual(expected);
});
