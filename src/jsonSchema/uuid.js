export default function uuid(typename) {
  return {
    oneOf: [
      { type: "string", format: "uuid" },
      {
        type: "object",
        properties: {
          __value: { type: "string", format: "uuid" },
          __typename: { type: "string", const: typename }
        }
      }
    ]
  };
}
