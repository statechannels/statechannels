import * as fs from 'fs';
import {compileFromFile} from 'json-schema-to-typescript';

const schemaFolder = `./schema`;
const typesFolder = `./types`;

(async (): Promise<void> => {
  for (const jsonSchemaFilepath of fs.readdirSync(schemaFolder)) {
    const t = await compileFromFile(`${schemaFolder}/${jsonSchemaFilepath}`, {
      cwd: schemaFolder,
      unreachableDefinitions: true
    });
    fs.writeFileSync(`${typesFolder}/${jsonSchemaFilepath.split('.json')[0]}.ts`, t);
  }
})();
