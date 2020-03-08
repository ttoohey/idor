import { gql } from "apollo-server";
import { graphql } from "graphql";
import { makeExecutableSchema } from "graphql-tools";
import { IndirectIdDirective } from "../src";

IndirectIdDirective.setOptions({ salt: "secret" });

describe("GraphQL @indirect directive", () => {
  const users = [
    { id: 1, name: "User 1" },
    { id: 2, name: "User 2" }
  ];
  const typeDefs = gql`
    directive @indirect(
      type: String
      scope: String = "PUBLIC"
      raw: Boolean = false
    ) on ARGUMENT_DEFINITION | FIELD_DEFINITION | INPUT_FIELD_DEFINITION

    type User {
      id: ID @indirect(type: "User")
      name: String
    }

    type UserIds {
      ids: [ID] @indirect(type: "User")
    }

    input UserInput {
      id: ID @indirect(type: "User")
      ids: [ID] @indirect(type: "User")
    }

    type Query {
      user(id: ID @indirect(type: "User"), input: UserInput): User
      users(
        ids: [ID] @indirect(type: "User")
        input: UserInput
        inputs: [UserInput]
      ): [User]
      userIds: UserIds
      userIdList: [ID] @indirect(type: "User")
    }
  `;
  const resolvers = {
    Query: {
      user(root, { id, input }) {
        if (input) {
          id = input.id;
        }
        return users.find(user => user.id === id);
      },
      users(root, { ids, input, inputs }) {
        if (input) {
          ids = input.ids;
        }
        if (inputs) {
          ids = inputs.map(({ id }) => id);
        }
        if (ids) {
          return users.filter(({ id }) => ids.includes(id));
        }
        return users;
      },
      userIds() {
        return { ids: users.map(({ id }) => id) };
      },
      userIdList() {
        return users.map(({ id }) => id);
      }
    }
  };

  const schemaDirectives = {
    indirect: IndirectIdDirective
  };

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives
  });

  test("response contains obfuscated IDs", async () => {
    const query = `
      query {
        users {
          id
        }
      }
    `;
    const variables = {};
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: {
        users: [
          { id: "7Xb1vhHJpWvaDUXl+tRluA" },
          { id: "hTAOWGzEEbUuCzTNVsL4dQ" }
        ]
      }
    };
    expect(received).toMatchObject(expected);
  });

  test("response contains list of obfuscated IDs", async () => {
    const query = `
      query {
        userIdList
      }
    `;
    const variables = {};
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { userIdList: ["7Xb1vhHJpWvaDUXl+tRluA", "hTAOWGzEEbUuCzTNVsL4dQ"] }
    };
    expect(received).toMatchObject(expected);
  });

  test("response contains object with list of obfuscated IDs", async () => {
    const query = `
      query {
        userIds { ids }
      }
    `;
    const variables = {};
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: {
        userIds: { ids: ["7Xb1vhHJpWvaDUXl+tRluA", "hTAOWGzEEbUuCzTNVsL4dQ"] }
      }
    };
    expect(received).toMatchObject(expected);
  });

  test("arguments can contain an obfuscated ID", async () => {
    const query = `
      query($id: ID!) {
        user(id: $id) {
          id
          name
        }
      }
    `;
    const variables = { id: "7Xb1vhHJpWvaDUXl+tRluA" };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { user: { id: "7Xb1vhHJpWvaDUXl+tRluA", name: "User 1" } }
    };
    expect(received).toMatchObject(expected);
  });

  test("arguments can contain an object with an obfuscated ID", async () => {
    const query = `
      query($input: UserInput) {
        user(input: $input) {
          id
          name
        }
      }
    `;
    const variables = { input: { id: "7Xb1vhHJpWvaDUXl+tRluA" } };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { user: { id: "7Xb1vhHJpWvaDUXl+tRluA", name: "User 1" } }
    };
    expect(received).toMatchObject(expected);
  });

  test("arguments can contain a list of obfuscated IDs", async () => {
    const query = `
      query($ids: [ID]) {
        users(ids: $ids) {
          id
          name
        }
      }
    `;
    const variables = { ids: ["7Xb1vhHJpWvaDUXl+tRluA"] };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { users: [{ id: "7Xb1vhHJpWvaDUXl+tRluA", name: "User 1" }] }
    };
    expect(received).toMatchObject(expected);
  });

  test("arguments can contain an object with a list of obfuscated IDs", async () => {
    const query = `
      query($input: UserInput) {
        users(input: $input) {
          id
          name
        }
      }
    `;
    const variables = { input: { ids: ["7Xb1vhHJpWvaDUXl+tRluA"] } };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { users: [{ id: "7Xb1vhHJpWvaDUXl+tRluA", name: "User 1" }] }
    };
    expect(received).toMatchObject(expected);
  });

  test("arguments can contain a list of objects with obfuscated IDs", async () => {
    const query = `
      query($inputs: [UserInput]) {
        users(inputs: $inputs) {
          id
          name
        }
      }
    `;
    const variables = { inputs: [{ id: "7Xb1vhHJpWvaDUXl+tRluA" }] };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { users: [{ id: "7Xb1vhHJpWvaDUXl+tRluA", name: "User 1" }] }
    };
    expect(received).toMatchObject(expected);
  });
});
