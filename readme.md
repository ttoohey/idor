# Basic usage

The Idor constructor accepts an unsigned int or UUID string identifier, and
a model type name that identifies the model class the identifier references.

The `.toString()` method returns a string that is safe to expose to the client side
(the "public id").

The `.valueOf()` method returns the original value (the "private id").

`Idor.fromString()` can be used to create a new Idor instance from a "public id"
string.

The `.typename` getter can be used to get the model class the identifier references.

```js
var Idor = require("idor").default({ salt: "secret" });

new Idor(1, "User").toString();
// 'FLN1a5AnVsGFmVXQYabHxA'

new Idor(1, "Post").toString();
// 'Dw3BiVRByuvYjKUKA4MjwQ'

Idor.fromString("FLN1a5AnVsGFmVXQYabHxA").valueOf();
// 1

Idor.fromString("FLN1a5AnVsGFmVXQYabHxA").typename;
// 'User'
```

The constructor will also accept UUID values.

```js
new Idor("123e4567-e89b-12d3-a456-426655440000", "User").toString();
// 'xhmWUgGswnl87h2bvkoB2LNy/QtjTfg9Cbp7dABDkrc'

Idor.fromString("xhmWUgGswnl87h2bvkoB2LNy/QtjTfg9Cbp7dABDkrc").valueOf();
// '123e4567-e89b-12d3-a456-426655440000'

Idor.fromString("xhmWUgGswnl87h2bvkoB2LNy/QtjTfg9Cbp7dABDkrc").typename;
// 'User'
```

# Scoped usage

Scoping Idor IDs allows adding an additional layer of abstraction on identifiers
exposed to the client-side.

```js
new Idor(1, "User", "private").toString();
// 'FqPuJ4ohXd2UvRvl+bvRvg'

Idor.fromString("FqPuJ4ohXd2UvRvl+bvRvg").valueOf();
// null (wrong scope)

Idor.fromString("FqPuJ4ohXd2UvRvl+bvRvg", "private").valueOf();
// 1

Idor.fromString("FqPuJ4ohXd2UvRvl+bvRvg", "private").typename;
// 'User'
```

The default scope is 'public'.

```js
new Idor(1, "User", "public").toString();
// 'FLN1a5AnVsGFmVXQYabHxA'
```

The `.scope` setter allows setting the scope after object initialisation

```js
const a = new Idor(1, "User");
a.scope = "private";
a.toString();
// "FqPuJ4ohXd2UvRvl+bvRvg"

const b = Idor.fromString("FqPuJ4ohXd2UvRvl+bvRvg");
b.scope = "private";
b.valueOf();
// 1
```

# Protect exposed identifiers

The application SHOULD set a unique salt to ensure identifiers cannot be computed
from exposed Idor values, or generated externally.

```js
var Idor = require("idor").default({ salt: "S3cr3t" });

new Idor(1, "User").toString();
// 'TCfNIEMg4cKgTS5cLsLXzg'

new Idor(1, "User", "private").toString();
// 'HURdRJrGSiIz0/rnvO1s+g'

Idor.fromString("HURdRJrGSiIz0/rnvO1s+g").valueOf();
// null (wrong salt)

Idor.fromString("TCfNIEMg4cKgTS5cLsLXzg").valueOf();
// 1
```

# Using with GraphQL schema directives

The IndirectIdDirective schema directive can be used to translate the ID type
to and from the public id.

```graphql
# typeDefs.graphql
directive @indirect(
  type: String
  scope: String = "PUBLIC"
  raw: Boolean = false
) on ARGUMENT_DEFINITION | FIELD_DEFINITION | INPUT_FIELD_DEFINITION

type Person {
  # Person.id will be returned as the obfuscated public ID value
  id: ID! @indirect(type: "Person")
}

type Mutation {
  updatePerson(
    # the `id` argument is provided by the client as the public ID, but the
    # `updatePerson` resolver will see the private database id.
    id: ID @indirect(type: "Person")
    name: String
    input: PersonInput
  ): Person
}

input PersonInput {
  # Any field that has an argument of type PersonInput will have that argument
  # translated from the public id to the private id.
  id: ID! @indirect(type: "Person")
  name: String
}
```

```js
import { ApolloServer } from "apollo-server";
import { makeExecutableSchema } from "graphql-tools";
import { IndirectIdDirective } from "idor";
import typeDefs from "./typeDefs";
import resolvers from "./resolvers";

// set a unique salt for ID translations
IndirectIdDirective.setOptions({ salt: process.env.APP_KEY })

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      indirect: IndirectIdDirective
    }
  })
);
const context = request => {
  // The `idor` property is used when using the `scope="CONTEXT"` argument
  idor: contextSensitiveScope(request)
};
const server = new ApolloServer({ schema, context });
```

## Schema Directive API

The `IndirectIdDirective` schema directive has two arguments:

- `type` - when translating to a public ID, this is embedded into the public ID;
  when translating from a public ID an exception will be thrown if the embedded type
  does not match
- `scope` - specifies how the scope argument for translating is sourced. If not
  provided the scope will be public. It can be set to 'PUBLIC' to use the public
  scope, or 'CONTEXT' to read a value from the `idor` property of the `context`
  object.

`IndirectIdDirective.setOptions()` is used to initialise the idor Idor constructor
with a unique application-specific salt.

`IndirectIdDirective.mergeScopeResolvers()` allows extending the possible values
for the `scope` argument.

```js
import { IndirectIdDirective } from "idor";

IndirectIdDirective.setOptions({ salt: process.env.APP_KEY })
IndirectIdDirective.mergeScopeResolvers({
  VIEWER: async (context, name) => {
    return context.viewer.id
  }
})

const typeDefs = `
type User {
  # `id` will be unique for each viewer
  id: ID! @indirect(type: "User", scope: "VIEWER")
}
`

const context = request => {
  viewer: getUser(request.headers.authorization)
};
```
