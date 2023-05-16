import idor from "../src";

test("Can create an obfuscated ID", () => {
  const Idor = idor({ salt: "secret" });
  const received = new Idor(1, "User").toString();
  const expected = "FLN1a5AnVsGFmVXQYabHxA";
  expect(received).toEqual(expected);
});

test("Type produces different strings", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    new Idor(1, "User").toString(),
    new Idor(1, "Post").toString(),
  ];
  const expected = ["FLN1a5AnVsGFmVXQYabHxA", "Dw3BiVRByuvYjKUKA4MjwQ"];
  expect(received).toMatchObject(expected);
});

test("Value produces different strings", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    new Idor(1, "User").toString(),
    new Idor(2, "User").toString(),
  ];
  const expected = ["FLN1a5AnVsGFmVXQYabHxA", "Re35aLsjbtwWA0KdZMw5qg"];
  expect(received).toMatchObject(expected);
});

test("Accepts BigInt values", () => {
  const Idor = idor({ salt: "secret" });
  const received = new Idor(1n, "User").toString();
  const expected = "SpSYCHJFD4XD+L4c1OIRUQ";
  expect(received).toEqual(expected);
});

test("Accepts UUID values", () => {
  const Idor = idor({ salt: "secret" });
  const received = new Idor(
    "123e4567-e89b-12d3-a456-426655440000",
    "User"
  ).toString();
  const expected = "xhmWUgGswnl87h2bvkoB2LNy/QtjTfg9Cbp7dABDkrc";
  expect(received).toEqual(expected);
});

test("Can be used with different scopes", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    new Idor(1, "User", "public").toString(),
    new Idor(1, "User", "private").toString(),
  ];
  const expected = ["FLN1a5AnVsGFmVXQYabHxA", "FqPuJ4ohXd2UvRvl+bvRvg"];
  expect(received).toEqual(expected);
});

test("Can parse an obfuscated ID", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    Idor.fromString("FLN1a5AnVsGFmVXQYabHxA").valueOf(),
    Idor.fromString("FLN1a5AnVsGFmVXQYabHxA").typename,
  ];
  const expected = [1, "User"];
  expect(received).toMatchObject(expected);
});

test("Can parse a scoped obfuscated ID ", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    Idor.fromString("FqPuJ4ohXd2UvRvl+bvRvg", "private").valueOf(),
    Idor.fromString("FqPuJ4ohXd2UvRvl+bvRvg", "private").typename,
  ];
  const expected = [1, "User"];
  expect(received).toMatchObject(expected);
});

test("Can parse an obfuscated BigInt", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    Idor.fromString("SpSYCHJFD4XD+L4c1OIRUQ").valueOf(),
    Idor.fromString("SpSYCHJFD4XD+L4c1OIRUQ").typename,
  ];
  const expected = [1n, "User"];
  expect(received).toMatchObject(expected);
});

test("Can parse an obfuscated UUID", () => {
  const Idor = idor({ salt: "secret" });
  const received = [
    Idor.fromString("xhmWUgGswnl87h2bvkoB2LNy/QtjTfg9Cbp7dABDkrc").valueOf(),
    Idor.fromString("xhmWUgGswnl87h2bvkoB2LNy/QtjTfg9Cbp7dABDkrc").typename,
  ];
  const expected = ["123e4567-e89b-12d3-a456-426655440000", "User"];
  expect(received).toMatchObject(expected);
});

test("Different salts produces different obfuscated IDs", () => {
  const Idor1 = idor({ salt: "secret" });
  const Idor2 = idor({ salt: "S3cr3t" });
  const received = [
    new Idor1(1, "User").toString(),
    new Idor2(1, "User").toString(),
  ];
  const expected = ["FLN1a5AnVsGFmVXQYabHxA", "TCfNIEMg4cKgTS5cLsLXzg"];
  expect(received).toEqual(expected);
});
