import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLList
} from "graphql";

/**
 * Helper function to apply a callback to all scalar types in a
 * GraphQL arguments input object
 * @param  {[type]} transformer The callback to apply to each argument
 */
function transformInputs(transformer) {
  const self = (value, field, context) => {
    let { name, type } = field;
    if (type instanceof GraphQLNonNull) {
      return self(value, { name, type: type.ofType }, context);
    } else if (type instanceof GraphQLList) {
      return value.map(listItemValue =>
        self(listItemValue, { name, type: type.ofType }, context)
      );
    } else if (type instanceof GraphQLInputObjectType) {
      const reducer = (result, field) =>
        Object.assign(result, {
          [field.name]: self(value[field.name], field, context)
        });
      return Object.values(type.getFields())
        .filter(field => Object.keys(value).includes(field.name))
        .reduce(reducer, {});
    } else {
      return transformer(type, value, context);
    }
  };
  return self;
}

function idorSchema(schema, options) {
  const Node = require('../index').default(options)

  /**
   * Rewrite the ID scalar type parser to use Node instances.
   */
  const ID = schema.getTypeMap().ID;
  ID.serialize = id => id.toString();
  ID.parseValue = nodeId => Node.fromString(nodeId);
  ID.parseLiteral = ast => Node.fromString(ast.value);

  const setNodeScope = transformInputs((type, input, context) => {
    if (type === ID) {
      input.scope = context.scope;
    }
    return input;
  });

  function toNode(type, field) {
    if (type === ID && !field.resolve) {
      field.resolve = (node, args, context) => {
        const typename = node.__typename || node.constructor.name;
        return new Node(node.id, typename, context.scope);
      };
    }
  }

  function toNodeList(type, field) {
    if (type === ID) {
      const original = field.resolve;
      field.resolve = async (root, args, context) => {
        const nodes = await Promise.resolve(original(...arguments));
        return nodes.map(node => {
          const typename = node.__typename || node.constructor.name;
          return new Node(node.id, typename, context.scope);
        });
      };
    }
  }

  Object.entries(schema.getTypeMap())
    .filter(([, type]) => type instanceof GraphQLObjectType)
    .forEach(([, type]) => {
      /**
       * Add the context scope to all ID type arguments before
       * running the type resolver.
       */
      Object.entries(type.getFields()).forEach(([, field]) => {
        if (!field.resolve) {
          return;
        }
        const original = field.resolve;
        field.resolve = (root, args, context, info) => {
          const reducer = (result, arg) =>
            Object.assign(result, {
              [arg.name]: setNodeScope(args[arg.name], arg, context)
            });
          const nextArgs = field.args
            .filter(field => args.hasOwnProperty(field.name))
            .reduce(reducer, {});
          return original(root, nextArgs, context, info);
        };
      });
      /**
       * Convert all ID type fields to Node instances.
       */
      Object.entries(type.getFields()).forEach(([, field]) => {
        if (field.type instanceof GraphQLNonNull) {
          toNode(field.type.ofType, field);
        } else if (field.type instanceof GraphQLList) {
          toNodeList(field.type.ofType, field);
        } else {
          toNode(field.type, field);
        }
      });
    });
  return schema;
}

export default idorSchema;
