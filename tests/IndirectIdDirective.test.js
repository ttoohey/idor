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

    input SubInput {
      subId: ID @indirect(type: "User")
    }

    input UserInput {
      id: ID @indirect(type: "User")
      ids: [ID] @indirect(type: "User")
      sub: SubInput
      subs: [SubInput]
    }

    input UserWithSubsInput {
      subs: [SubInput]
      nonnullSubs: [SubInput!]
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
      usersWithSub(input: UserWithSubsInput!): [User]
    }
  `;
  const resolvers = {
    Query: {
      user(root, { id, input }) {
        if (input) {
          id = input.id;
          if (input.sub) {
            id = input.sub.subId;
          }
        }
        return users.find(user => user.id === id);
      },
      users(root, { ids, input, inputs }) {
        if (input) {
          ids = input.ids;
          if (input.subs) {
            ids = input.subs.map(({ subId }) => subId);
          }
          if (input.nonnullSubs) {
            ids = input.nonnullSubs.map(({ subId }) => subId);
          }
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
      },
      usersWithSub(...args) {
        return resolvers.Query.users(...args);
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
          { id: "FLN1a5AnVsGFmVXQYabHxA" },
          { id: "Re35aLsjbtwWA0KdZMw5qg" }
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
      data: { userIdList: ["FLN1a5AnVsGFmVXQYabHxA", "Re35aLsjbtwWA0KdZMw5qg"] }
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
        userIds: { ids: ["FLN1a5AnVsGFmVXQYabHxA", "Re35aLsjbtwWA0KdZMw5qg"] }
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
    const variables = { id: "FLN1a5AnVsGFmVXQYabHxA" };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { user: { id: "FLN1a5AnVsGFmVXQYabHxA", name: "User 1" } }
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
    const variables = { input: { id: "FLN1a5AnVsGFmVXQYabHxA" } };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { user: { id: "FLN1a5AnVsGFmVXQYabHxA", name: "User 1" } }
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
    const variables = { ids: ["FLN1a5AnVsGFmVXQYabHxA"] };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { users: [{ id: "FLN1a5AnVsGFmVXQYabHxA", name: "User 1" }] }
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
    const variables = { input: { ids: ["FLN1a5AnVsGFmVXQYabHxA"] } };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { users: [{ id: "FLN1a5AnVsGFmVXQYabHxA", name: "User 1" }] }
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
    const variables = { inputs: [{ id: "FLN1a5AnVsGFmVXQYabHxA" }] };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { users: [{ id: "FLN1a5AnVsGFmVXQYabHxA", name: "User 1" }] }
    };
    expect(received).toMatchObject(expected);
  });

  test("arguments can contain a nested object with an obfuscated ID", async () => {
    const query = `
        query($input: UserInput) {
          user(input: $input) {
            id
            name
          }
        }
      `;
    const variables = { input: { sub: { subId: "FLN1a5AnVsGFmVXQYabHxA" } } };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { user: { id: "FLN1a5AnVsGFmVXQYabHxA", name: "User 1" } }
    };
    expect(received).toMatchObject(expected);
  });

  test("arguments can contain a nested list of objects with an obfuscated ID", async () => {
    const query = `
      query($input: UserWithSubsInput!) {
        usersWithSub(input: $input) {
          id
          name
        }
      }
    `;
    const variables = {
      input: { subs: [{ subId: "FLN1a5AnVsGFmVXQYabHxA" }] }
    };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { usersWithSub: [{ id: "FLN1a5AnVsGFmVXQYabHxA", name: "User 1" }] }
    };
    expect(received).toMatchObject(expected);
  });

  test("arguments can contain a nested list of nonnull objects with an obfuscated ID", async () => {
    const query = `
      query($input: UserWithSubsInput!) {
        usersWithSub(input: $input) {
          id
          name
        }
      }
    `;
    const variables = {
      input: { nonnullSubs: [{ subId: "FLN1a5AnVsGFmVXQYabHxA" }] }
    };
    const received = await graphql(schema, query, null, {}, variables);
    const expected = {
      data: { usersWithSub: [{ id: "FLN1a5AnVsGFmVXQYabHxA", name: "User 1" }] }
    };
    expect(received).toMatchObject(expected);
  });
});
