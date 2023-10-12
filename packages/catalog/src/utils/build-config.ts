import {
  cleanGraphQLSchema,
  getFieldsAndRelations,
  MedusaModule,
  ModuleJoinerRelationship,
} from "@medusajs/modules-sdk"
import { ObjectTypeDefinitionNode } from "graphql/index"
import { JoinerServiceConfigAlias, ModuleJoinerConfig } from "@medusajs/types"
import { makeExecutableSchema } from "@graphql-tools/schema"
import {
  SchemaObjectEntityRepresentation,
  SchemaObjectRepresentation,
} from "../types"

export const CustomDirectives = {
  Listeners: {
    configurationPropertyName: "listeners",
    isRequired: true,
    name: "Listeners",
    directive: "@Listeners",
    definition: "directive @Listeners (values: [String!]) on OBJECT",
  },
}

function makeSchemaExecutable(inputSchema: string) {
  const { schema: cleanedSchema } = cleanGraphQLSchema(inputSchema)
  return makeExecutableSchema({ typeDefs: cleanedSchema })
}

function retrieveLinkedEntityNameAndAliasFromLinkModule(
  linkModuleJoinerConfig,
  relatedModuleJoinerConfig
) {
  const linkRelationships = linkModuleJoinerConfig.relationships
  const linkRelationship = linkRelationships.find((relationship) => {
    return relatedModuleJoinerConfig.serviceName === relationship.serviceName
  })

  const foreignKey = linkRelationship.foreignKey

  let alias
  let entityName

  const linkableKeys = relatedModuleJoinerConfig.linkableKeys
  entityName = linkableKeys[foreignKey]

  if (!entityName) {
    throw new Error(
      `CatalogModule error, unable to retrieve the entity name from the link module configuration for the linkable key ${foreignKey}.`
    )
  }

  const moduleAliases = relatedModuleJoinerConfig.alias

  if (moduleAliases) {
    alias = retrieveAliasForEntity(
      entityName,
      relatedModuleJoinerConfig.serviceName,
      relatedModuleJoinerConfig.alias
    )
  }

  if (!alias) {
    throw new Error(
      `CatalogModule error, the module ${relatedModuleJoinerConfig.serviceName} has a schema but does not have any alias for the entity ${entityName}. Please add an alias to the module configuration and the entity it correspond to in the args under the entity property.`
    )
  }

  return { entityName, alias }
}

function retrieveAliasForEntity(entityName, serviceName, aliases) {
  aliases = Array.isArray(aliases) ? aliases : [aliases]

  aliases = aliases.filter(Boolean)

  aliases = aliases
    .filter(Boolean)
    .map((alias) => {
      const names = Array.isArray(alias?.name) ? alias?.name : [alias?.name]
      return names?.map((name) => ({
        name,
        args: alias?.args,
      }))
    })
    .flat() as JoinerServiceConfigAlias[]

  let alias = aliases.find((alias) => {
    const curEntity = alias!.args?.entity || alias?.name
    return curEntity && curEntity.toLowerCase() === entityName.toLowerCase()
  })
  alias = alias?.name

  return alias
}

function retrieveModuleAndAlias(entityName, moduleJoinerConfigs) {
  let relatedModule
  let alias

  for (const moduleJoinerConfig of moduleJoinerConfigs) {
    const moduleSchema = moduleJoinerConfig.schema
    const moduleAliases = moduleJoinerConfig.alias

    /**
     * If the entity exist in the module schema, then the current module is the
     * one we are looking for.
     *
     * If the module does not have any schema, then we need to base the search
     * on the provided aliases. in any case, we try to get both
     */

    if (moduleSchema) {
      const executableSchema = makeSchemaExecutable(moduleSchema)
      const entitiesMap = executableSchema.getTypeMap()

      if (entitiesMap[entityName]) {
        relatedModule = moduleJoinerConfig
      }
    }

    if (relatedModule && moduleAliases) {
      alias = retrieveAliasForEntity(
        entityName,
        moduleJoinerConfig.serviceName,
        moduleJoinerConfig.alias
      )
    }

    if (relatedModule) {
      break
    }
  }

  if (!relatedModule) {
    throw new Error(
      `CatalogModule error, unable to retrieve the module that correspond to the entity ${entityName}. Please add the entity to the module schema or add an alias to the module configuration and the entity it correspond to in the args under the entity property.`
    )
  }

  if (!alias) {
    throw new Error(
      `CatalogModule error, the module ${relatedModule?.serviceName} has a schema but does not have any alias for the entity ${entityName}. Please add an alias to the module configuration and the entity it correspond to in the args under the entity property.`
    )
  }

  return { relatedModule, alias }
}

// TODO: rename util
function retrieveLinkModuleAndAlias({
  primaryEntity,
  primaryModuleConfig,
  foreignEntity,
  foreignModuleConfig,
  moduleJoinerConfigs,
}: {
  primaryEntity: string
  primaryModuleConfig: ModuleJoinerConfig
  foreignEntity: string
  foreignModuleConfig: ModuleJoinerConfig
  moduleJoinerConfigs: ModuleJoinerConfig[]
}): {
  entityName: string
  alias: string
  linkModuleConfig: ModuleJoinerConfig
  intermediateEntityNames: string[]
}[] {
  const linkModulesMetadata: {
    entityName: string
    alias: string
    linkModuleConfig: ModuleJoinerConfig
    intermediateEntityNames: string[]
  }[] = []

  for (const linkModuleJoinerConfig of moduleJoinerConfigs.filter(
    (config) => config.isLink
  )) {
    const linkPrimary =
      linkModuleJoinerConfig.relationships![0] as ModuleJoinerRelationship
    const linkForeign =
      linkModuleJoinerConfig.relationships![1] as ModuleJoinerRelationship

    if (
      linkPrimary.serviceName === primaryModuleConfig.serviceName &&
      linkForeign.serviceName === foreignModuleConfig.serviceName
    ) {
      const primaryEntityLinkableKey = linkPrimary.foreignKey
      const isTheForeignKeyEntityEqualPrimaryEntity =
        primaryModuleConfig.linkableKeys?.[primaryEntityLinkableKey] ===
        primaryEntity

      const foreignEntityLinkableKey = linkForeign.foreignKey
      const isTheForeignKeyEntityEqualForeignEntity =
        foreignModuleConfig.linkableKeys?.[foreignEntityLinkableKey] ===
        foreignEntity

      const linkName = linkModuleJoinerConfig.extends?.find((extend) => {
        return (
          extend.serviceName === primaryModuleConfig.serviceName &&
          extend.relationship.primaryKey === primaryEntityLinkableKey
        )
      })?.relationship.serviceName

      if (!linkName) {
        throw new Error(
          `CatalogModule error, unable to retrieve the link module name for the services ${primaryModuleConfig.serviceName} - ${foreignModuleConfig.serviceName}. Please be sure that the extend relationship service name is set correctly`
        )
      }

      if (!linkModuleJoinerConfig.alias?.[0]?.args?.entity) {
        throw new Error(
          `CatalogModule error, unable to retrieve the link module entity name for the services ${primaryModuleConfig.serviceName} - ${foreignModuleConfig.serviceName}. Please be sure that the link module alias has an entity property in the args.`
        )
      }

      if (
        isTheForeignKeyEntityEqualPrimaryEntity &&
        isTheForeignKeyEntityEqualForeignEntity
      ) {
        linkModulesMetadata.push({
          entityName: linkModuleJoinerConfig.alias[0].args.entity,
          alias: linkModuleJoinerConfig.alias[0].name,
          linkModuleConfig: linkModuleJoinerConfig,
          intermediateEntityNames: [],
        })
      } else {
        const intermediateEntityName =
          foreignModuleConfig.linkableKeys![foreignEntityLinkableKey]

        if (!foreignModuleConfig.schema) {
          throw new Error(
            `CatalogModule error, unable to retrieve the intermediate entity name for the services ${primaryModuleConfig.serviceName} - ${foreignModuleConfig.serviceName}. Please be sure that the foreign module ${foreignModuleConfig.serviceName} has a schema.`
          )
        }

        // TODO: look if we can grab that from medusa app
        const executableSchema = makeSchemaExecutable(
          foreignModuleConfig.schema
        )
        const entitiesMap = executableSchema.getTypeMap()

        let intermediateEntities: string[] = []
        let foundCount = 0

        const isForeignEntityChildOfIntermediateEntity = (
          entityName
        ): boolean => {
          for (const entityType of Object.values(entitiesMap)) {
            if (
              entityType.astNode?.kind === "ObjectTypeDefinition" &&
              entityType.astNode?.fields?.some((field) => {
                return (field.type as any)?.type?.name?.value === entityName
              })
            ) {
              if (entityType.name === intermediateEntityName) {
                ++foundCount
                return true
              } else {
                const test = isForeignEntityChildOfIntermediateEntity(
                  entityType.name
                )
                if (test) {
                  intermediateEntities.push(entityType.name)
                }
              }
            }
          }

          return false
        }

        isForeignEntityChildOfIntermediateEntity(foreignEntity)

        if (foundCount !== 1) {
          throw new Error(
            `CatalogModule error, unable to retrieve the intermediate entities for the services ${primaryModuleConfig.serviceName} - ${foreignModuleConfig.serviceName} between ${foreignEntity} and ${intermediateEntityName}. Multiple paths or no path found. Please check your schema in ${foreignModuleConfig.serviceName}`
          )
        }

        intermediateEntities.push(intermediateEntityName!)

        linkModulesMetadata.push({
          entityName: linkModuleJoinerConfig.alias[0].args.entity,
          alias: linkModuleJoinerConfig.alias[0].name,
          linkModuleConfig: linkModuleJoinerConfig,
          intermediateEntityNames: intermediateEntities,
        })
      }
    }
  }

  if (!linkModulesMetadata.length) {
    throw new Error(
      `CatalogModule error, unable to retrieve the link module that correspond to the entities ${primaryEntity} - ${foreignEntity}.`
    )
  }

  return linkModulesMetadata
}

/*function retrieveLinkModuleAndAlias(
  entityServiceName,
  parentEntityServiceName,
  moduleJoinerConfigs
) {
  let relatedModule
  let alias

  for (const moduleJoinerConfig of moduleJoinerConfigs.filter(
    (config) => config.isLink
  )) {
    const linkPrimary = moduleJoinerConfig.relationships[0]
    const linkForeign = moduleJoinerConfig.relationships[1]

    if (
      linkPrimary.serviceName === parentEntityServiceName &&
      linkForeign.serviceName === entityServiceName
    ) {
      relatedModule = moduleJoinerConfig
      alias = moduleJoinerConfig.alias[0].name
      alias = Array.isArray(alias) ? alias[0] : alias
    }
  }

  if (!relatedModule) {
    throw new Error(
      `CatalogModule error, unable to retrieve the link module that correspond to the services ${parentEntityServiceName} - ${entityServiceName}.`
    )
  }

  return { relatedModule, alias }
}*/

function getObjectRepresentationRef(
  entityName,
  { objectRepresentationRef }
): SchemaObjectEntityRepresentation {
  return (objectRepresentationRef[entityName] ??= {
    entity: entityName,
    parents: [],
    alias: "",
    listeners: [],
    moduleConfig: null,
    fields: [],
  })
}

function setCustomDirectives(currentObjectRepresentationRef, directives) {
  for (const customDirectiveConfiguration of Object.values(CustomDirectives)) {
    const directive = directives.find(
      (typeDirective) =>
        typeDirective.name.value === customDirectiveConfiguration.name
    )

    if (!directive) {
      if (customDirectiveConfiguration.isRequired) {
        throw new Error(
          `CatalogModule error, the type ${currentObjectRepresentationRef.entity} defined in the schema is missing the ${customDirectiveConfiguration.directive} directive which is required`
        )
      }

      return
    }

    // Only support array directive value for now
    currentObjectRepresentationRef[
      customDirectiveConfiguration.configurationPropertyName
    ] = ((directive.arguments[0].value as any)?.values ?? []).map(
      (v) => v.value
    )
  }
}

function processEntity(
  entityName: string,
  {
    entitiesMap,
    moduleJoinerConfigs,
    objectRepresentationRef,
  }: {
    entitiesMap: any
    moduleJoinerConfigs: ModuleJoinerConfig[]
    objectRepresentationRef: SchemaObjectRepresentation
  }
) {
  /**
   * Get the reference to the object representation for the current entity.
   */

  const currentObjectRepresentationRef = getObjectRepresentationRef(
    entityName,
    {
      objectRepresentationRef,
    }
  )

  /**
   * Retrieve and set the custom directives for the current entity.
   */

  setCustomDirectives(
    currentObjectRepresentationRef,
    entitiesMap[entityName].astNode?.directives ?? []
  )

  currentObjectRepresentationRef.fields =
    getFieldsAndRelations(entitiesMap, entityName) ?? []

  /**
   * Retrieve the module and alias for the current entity.
   */

  const { relatedModule: currentEntityModule, alias } = retrieveModuleAndAlias(
    entityName,
    moduleJoinerConfigs
  )

  currentObjectRepresentationRef.moduleConfig = currentEntityModule
  currentObjectRepresentationRef.alias = alias

  /**
   * Retrieve the parent entities for the current entity.
   */

  const schemaParentEntity = Object.values(entitiesMap).filter((value: any) => {
    return (
      value.astNode &&
      (value.astNode as ObjectTypeDefinitionNode).fields?.some((field) => {
        return (field.type as any)?.type?.name?.value === entityName
      })
    )
  })

  /**
   * If the current entity has parent entities, then we need to process them.
   */

  if (schemaParentEntity.length) {
    const parentEntityNames = schemaParentEntity.map((parent: any) => {
      return parent.name
    })

    for (const parent of parentEntityNames) {
      /**
       * Retrieve the parent entity field in the schema
       */

      const entityFieldInParent = (
        entitiesMap[parent].astNode as any
      )?.fields?.find((field) => {
        return (field.type as any)?.type?.name?.value === entityName
      })

      const isEntityListInParent = entityFieldInParent.type.kind === "ListType"
      const entityTargetPropertyNameInParent = entityFieldInParent.name.value

      /**
       * Retrieve the parent entity object representation reference.
       */

      const parentObjectRepresentationRef = getObjectRepresentationRef(parent, {
        objectRepresentationRef,
      })
      const parentModuleConfig = parentObjectRepresentationRef.moduleConfig

      /**
       * If the parent entity and the current entity are part of the same servive then configure the parent and
       * add the parent id as a field to the current entity.
       */

      if (
        currentObjectRepresentationRef.moduleConfig.serviceName ===
          parentModuleConfig.serviceName ||
        parentModuleConfig.isLink
      ) {
        currentObjectRepresentationRef.parents.push({
          ref: parentObjectRepresentationRef,
          targetProp: entityTargetPropertyNameInParent,
          isList: isEntityListInParent,
        })

        currentObjectRepresentationRef.fields.push(
          parentObjectRepresentationRef.alias + ".id"
        )
      } else {
        /**
         * If the parent entity and the current entity are not part of the same service then we need to
         * find the link module that join them.
         */

        const linkModuleMetadatas = retrieveLinkModuleAndAlias({
          primaryEntity: parentObjectRepresentationRef.entity,
          primaryModuleConfig: parentModuleConfig,
          foreignEntity: currentObjectRepresentationRef.entity,
          foreignModuleConfig: currentEntityModule,
          moduleJoinerConfigs,
        })

        for (const linkModuleMetadata of linkModuleMetadatas) {
          const linkObjectRepresentationRef = getObjectRepresentationRef(
            linkModuleMetadata.entityName,
            { objectRepresentationRef }
          )

          /**
           * Add the schema parent entity as a parent to the link module and configure it.
           */

          linkObjectRepresentationRef.parents = [
            {
              ref: parentObjectRepresentationRef,
              targetProp: linkModuleMetadata.alias,
            },
          ]
          linkObjectRepresentationRef.alias = linkModuleMetadata.alias
          linkObjectRepresentationRef.listeners = [
            `${linkModuleMetadata.entityName}.attached`,
            `${linkModuleMetadata.entityName}.detached`,
          ]
          linkObjectRepresentationRef.moduleConfig =
            linkModuleMetadata.linkModuleConfig

          linkObjectRepresentationRef.fields = [
            ...linkModuleMetadata.linkModuleConfig
              .relationships!.map(
                (relationship) =>
                  [
                    parentModuleConfig.serviceName,
                    currentEntityModule.serviceName,
                  ].includes(relationship.serviceName) &&
                  relationship.foreignKey
              )
              .filter((v): v is string => Boolean(v)),
            parentObjectRepresentationRef.alias + ".id",
          ]

          /**
           * If the current entity is not the entity that is used to join the link module and the parent entity
           * then we need to add the new entity that join them and then add the link as its parent
           * before setting the new entity as the true parent of the current entity.
           */

          for (
            let i = linkModuleMetadata.intermediateEntityNames.length - 1;
            i >= 0;
            --i
          ) {
            const intermediateEntityName =
              linkModuleMetadata.intermediateEntityNames[i]
            const parentIntermediateEntityRef =
              i === linkModuleMetadata.intermediateEntityNames.length - 1
                ? linkObjectRepresentationRef
                : objectRepresentationRef[
                    linkModuleMetadata.intermediateEntityNames[i + 1]
                  ]

            const {
              relatedModule: intermediateEntityModule,
              alias: intermediateEntityAlias,
            } = retrieveModuleAndAlias(
              intermediateEntityName,
              moduleJoinerConfigs
            )

            const intermediateEntityObjectRepresentationRef =
              getObjectRepresentationRef(intermediateEntityName, {
                objectRepresentationRef,
              })

            intermediateEntityObjectRepresentationRef.parents.push({
              ref: parentIntermediateEntityRef,
              targetProp: intermediateEntityAlias,
              isList: true, // TODO: check if it is a list in retrieveLinkModuleAndAlias and return the intermediate entity names + isList for each
            })

            intermediateEntityObjectRepresentationRef.alias =
              intermediateEntityAlias
            intermediateEntityObjectRepresentationRef.listeners = [
              intermediateEntityName + ".created",
              intermediateEntityName + ".updated",
            ]
            intermediateEntityObjectRepresentationRef.moduleConfig =
              intermediateEntityModule
            intermediateEntityObjectRepresentationRef.fields = [
              "id",
              linkObjectRepresentationRef.alias + ".id",
            ]
          }

          let currentParentIntermediateRef = linkObjectRepresentationRef
          if (linkModuleMetadata.intermediateEntityNames.length) {
            currentParentIntermediateRef =
              objectRepresentationRef[
                linkModuleMetadata.intermediateEntityNames[0]
              ]
          }

          currentObjectRepresentationRef.parents.push({
            ref: currentParentIntermediateRef,
            inSchemaRef: parentObjectRepresentationRef,
            targetProp: entityTargetPropertyNameInParent,
            isList: isEntityListInParent,
          })

          currentObjectRepresentationRef.fields.push(
            currentParentIntermediateRef.alias + ".id"
          )
        }
      }
    }
  }
}

/**
 * Build a special object which will be used to retrieve the correct
 * object representation using path tree
 *
 * @example
 * {
 *   _schemaPropertiesMap: {
 *     "product": <ProductRef>
 *     "product.variants": <ProductVariantRef>
 *   }
 * }
 */
function buildAliasMap(objectRepresentation: SchemaObjectRepresentation) {
  const aliasMap: SchemaObjectRepresentation["_schemaPropertiesMap"] = {}

  function recursivelyBuildAliasPath(
    current,
    alias = "",
    aliases: { alias: string; shortCutOf?: string }[] = []
  ): { alias: string; shortCutOf?: string }[] {
    if (current.parents?.length) {
      for (const parentEntity of current.parents) {
        /**
         * Here we build the alias from child to parent to get it as parent to child
         */

        const _aliases = recursivelyBuildAliasPath(
          parentEntity.ref,
          `${parentEntity.targetProp}${alias ? "." + alias : ""}`
        ).map((alias) => ({ alias: alias.alias }))

        aliases.push(..._aliases)

        /**
         * Now if there is a inSchemaRef it means that we had inferred a link module
         * and we want to get the alias path as it would be in the schema provided
         * and it become the short cut path of the full path above
         */

        if (parentEntity.inSchemaRef) {
          const shortCutOf = _aliases.map((a) => a.alias)[0]
          const _aliasesShortCut = recursivelyBuildAliasPath(
            parentEntity.inSchemaRef,
            `${parentEntity.targetProp}${alias ? "." + alias : ""}`
          ).map((alias_) => {
            return {
              alias: alias_.alias,
              // It has to be the same entry point
              shortCutOf:
                shortCutOf.split(".")[0] === alias_.alias.split(".")[0]
                  ? shortCutOf
                  : undefined,
            }
          })

          aliases.push(..._aliasesShortCut)
        }
      }
    }

    aliases.push({ alias: current.alias + (alias ? "." + alias : "") })

    return aliases
  }

  for (const entityRepresentation of Object.values(objectRepresentation)) {
    const aliases = recursivelyBuildAliasPath(entityRepresentation)

    for (const alias of aliases) {
      aliasMap[alias.alias] = {
        ref: entityRepresentation,
      }

      if (alias.shortCutOf) {
        aliasMap[alias.alias]["shortCutOf"] = alias.shortCutOf
      }
    }
  }

  return aliasMap
}

/**
 * This util build an internal representation object from the provided schema.
 * It will resolve all modules, fields, link module representation to build
 * the appropriate representation for the catalog module.
 *
 * This representation will be used to re construct the expected output object from a search
 * but can also be used for anything since the relation tree is available through ref.
 *
 * @param schema
 */
export function buildSchemaObjectRepresentation(schema) {
  const moduleJoinerConfigs = MedusaModule.getAllJoinerConfigs()
  const augmentedSchema = CustomDirectives.Listeners.definition + schema
  const executableSchema = makeSchemaExecutable(augmentedSchema)
  const entitiesMap = executableSchema.getTypeMap()

  const objectRepresentation = {} as SchemaObjectRepresentation

  Object.entries(entitiesMap).forEach(([entityName, entityMapValue]) => {
    if (!entityMapValue.astNode) {
      return
    }

    processEntity(entityName, {
      entitiesMap,
      moduleJoinerConfigs,
      objectRepresentationRef: objectRepresentation,
    })
  })

  objectRepresentation._schemaPropertiesMap =
    buildAliasMap(objectRepresentation)

  return objectRepresentation
}
