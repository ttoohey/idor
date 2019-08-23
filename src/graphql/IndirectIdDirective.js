import { SchemaDirectiveVisitor, UserInputError } from "apollo-server";
import { GraphQLInputObjectType, GraphQLObjectType } from "graphql";

function isTypeOf(a, b) {
  return a === b || a.ofType === b;
}
function spreadTuple(accum, tuple) {
  const list = tuple.pop();
  return [...accum, ...list.map(item => [...tuple, item])];
}

export default class extends SchemaDirectiveVisitor {
  static IdorClass = null;
  static scopeResolvers = {
    PUBLIC: () => null,
    CONTEXT: (context, name) => {
      if (!context.idor) {
        throw new UserInputError(`${name} expects \`context.idor\` to be set`);
      }
      return context.idor;
    }
  };

  static mergeScopeResolvers(resolvers) {
    this.scopeResolvers = {
      ...this.scopeResolvers,
      ...resolvers
    };
  }

  static setOptions(options) {
    this.IdorClass = require("../index").default(options);
  }

  resolveScope(context, name) {
    const scopeType = this.args.scope;
    const resolve = this.constructor.scopeResolvers[scopeType];
    if (!resolve) {
      throw new UserInputError(`${name} has an unknown scope type`);
    }
    return resolve.call(this, context, name);
  }

  resolveArgument(args, path, context) {
    if (path.length === 0 || args === undefined) {
      return args;
    }
    const [[objectType, name], ...rest] = path;
    if (path.length === 1) {
      const { raw, type } = this.args;
      const scope = this.resolveScope(context, `${objectType}.${name}`);
      const value = args[name];
      if (value === null || value === undefined) {
        return value;
      }
      const { IdorClass } = this.constructor;
      const id = IdorClass.fromString(value, scope);
      if (!id || id.typename === null) {
        throw new UserInputError(`Invalid indirect ID.`);
      }
      if (id.typename !== type && type !== undefined) {
        throw new UserInputError(
          `Invalid indirect ID. Expected type "${type}" but found "${id.typename}"`
        );
      }
      return { ...args, [name]: raw ? id : id.valueOf() };
    }
    return {
      ...args,
      [name]: this.resolveArgument(args[name], rest, context)
    };
  }

  visitArgumentDefinition(arg, { field }) {
    this.walkArgumentDefinition(field, [[field.name, arg.name]]);
  }

  visitFieldDefinition(field, { objectType }) {
    const resolve = field.resolve;
    const type = this.args.type || objectType.name;
    field.resolve = async (...args) => {
      const value = await resolve(...args);
      if (value === null || value === undefined) {
        return value;
      }
      const { IdorClass } = this.constructor;
      const ctx = args[2];
      const scope = this.resolveScope(ctx, `${objectType.name}.${field.name}`);
      return new IdorClass(value, type, scope).toString();
    };
  }

  visitInputFieldDefinition(field, details) {
    this.walkInputFieldDefinition(field, details, []);
  }

  walkInputFieldDefinition(inputField, { objectType }, path = []) {
    // recursively walk the schema to find where this field is used
    this.getInputObjectParentsOfInputField(objectType).forEach(
      ([type, field]) => {
        if (path.map(([name]) => name).includes(type.name)) {
          return
        }
        this.walkInputFieldDefinition(field, { objectType: type }, [
          [type.name, inputField.name],
          ...path
        ]);
      }
    );
    // rewrite resolve() arguments when we get to an object
    this.getObjectParentsOfInputField(objectType).forEach(
      ([type, field, arg]) => {
        this.walkArgumentDefinition(field, [
          [`${type.name}.${field.name}`, arg.name],
          [objectType.name, inputField.name],
          ...path
        ]);
      }
    );
  }

  walkArgumentDefinition(field, path) {
    const resolve = field.resolve;
    field.resolve = (root, originalArgs, context, ...rest) => {
      context.originalArgs = originalArgs;
      const args = this.resolveArgument(originalArgs, path, context);
      return resolve(root, args, context, ...rest);
    };
  }

  /**
   * List all input objects in the schema that have a field that matches the
   * provided input object type.
   *
   * Returns a list of [type, field] tuples for each place the input type is
   * used in another InputObject.
   *
   * @param  {[GraphQLInputObjectType]} objectType An InputObject type to search for
   * @return {[Array]}                             List of [type, field] tuples
   */
  getInputObjectParentsOfInputField(objectType) {
    return (
      Object.values(this.schema.getTypeMap())
        .filter(type => type instanceof GraphQLInputObjectType)
        // map to (type, fields[]) tuples
        .map(type => [
          type,
          Object.values(type.getFields()).filter(field =>
            isTypeOf(field.type, objectType)
          )
        ])
        // spread fields[] so we end up with (type, field) tuples
        .reduce(spreadTuple, [])
    );
  }

  /**
   * List all objects in the schema that have a field with arguments that match
   * the provided input object type.
   *
   * Returns a list of [type, field, arg] tuples for each place the input type
   * is used in an field argument.
   *
   * @param  {[GraphQLInputObjectType]} objectType An InputObject type to search for
   * @return {[Array]}                             List of [type, field, arg] tuples
   */
  getObjectParentsOfInputField(objectType) {
    return (
      Object.values(this.schema.getTypeMap())
        .filter(type => type instanceof GraphQLObjectType)
        // map to (type, fields[]) tuples
        .map(type => [
          type,
          Object.values(type.getFields()).filter(
            field =>
              field.args.filter(arg => isTypeOf(arg.type, objectType)).length >
              0
          )
        ])
        // spread fields[] so we get (type, field) tuples
        .reduce(spreadTuple, [])
        // map those to (type, field, args[]) tuples
        .map(([type, field]) => [
          type,
          field,
          field.args.filter(arg => isTypeOf(arg.type, objectType))
        ])
        // spread the args[] list so we get (type, field, arg) tuples
        .reduce(spreadTuple, [])
    );
  }
}
