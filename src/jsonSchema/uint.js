
export default function uint(typename) {
  return {
    oneOf: [
      { type: "number", minimum: 0, maximum: 2**32 - 1 },
      {
        type: "object",
        properties: {
          __value: { type: "number", minimum: 0, maximum: 2**32 - 1 },
          __typename: { type: "string", const: typename }
        }
      }
    ]
  };
}
