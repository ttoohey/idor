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
