/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */

import * as program from 'commander';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { RefreshSkill } from './functionality';
import { ConsoleLogger, ILogger} from './logger';
import { ICognitiveModel, IRefreshConfiguration } from './models';
import { sanitizePath, validatePairOfArgs } from './utils';

function showErrorHelp(): void {
    program.outputHelp((str: string) => {
        logger.error(str);

        return '';
    });
    process.exit(1);
}

const logger: ILogger = new ConsoleLogger();

program.Command.prototype.unknownOption = (flag: string): void => {
    logger.error(`Unknown arguments: ${flag}`);
    showErrorHelp();
};

// tslint:disable: max-line-length
program
    .name('botskills refresh')
    .description('Refresh the connected skills.')
    .option('--cs', 'Determine your assistant project structure to be a CSharp-like structure')
    .option('--ts', 'Determine your assistant project structure to be a TypeScript-like structure')
    .option('--dispatchName [name]', '[OPTIONAL] Name of your assistant\'s \'.dispatch\' file (defaults to the name displayed in your Cognitive Models file)')
    .option('--language [language]', '[OPTIONAL] Locale used for LUIS culture (defaults to \'en-us\')')
    .option('--dispatchFolder [path]', '[OPTIONAL] Path to the folder containing your assistant\'s \'.dispatch\' file (defaults to \'./deployment/resources/dispatch/en\' inside your assistant folder)')
    .option('--outFolder [path]', '[OPTIONAL] Path for any output file that may be generated (defaults to your assistant\'s root folder)')
    .option('--lgOutFolder [path]', '[OPTIONAL] Path for the LuisGen output (defaults to a \'service\' folder inside your assistant\'s folder)')
    .option('--cognitiveModelsFile [path]', '[OPTIONAL] Path to your Cognitive Models file (defaults to \'cognitivemodels.json\' inside your assistant\'s folder)')
    .option('--verbose', '[OPTIONAL] Output detailed information about the processing of the tool')
    .action((cmd: program.Command, actions: program.Command) => undefined);

const args: program.Command = program.parse(process.argv);

if (process.argv.length < 3) {
    program.help();
    process.exit(0);
}

let dispatchName: string;
let dispatchFolder: string;
let language: string;
let lgLanguage: string;
let outFolder: string;
let lgOutFolder: string;
let cognitiveModelsFile: string;

logger.isVerbose = args.verbose;

// Validation of arguments
// cs and ts validation
const csAndTsValidationResult: string = validatePairOfArgs(args.cs, args.ts);
if (csAndTsValidationResult) {
    logger.error(
        csAndTsValidationResult.replace('{0}', 'cs')
        .replace('{1}', 'ts')
    );
    process.exit(1);
}

lgLanguage = args.cs ? 'cs' : 'ts';

// language validation
language = args.language || 'en-us';
const languageCode: string = (language.split('-'))[0];

// outFolder validation -- the var is needed for reassuring 'configuration.outFolder' is not undefined
outFolder = args.outFolder ? sanitizePath(args.outFolder) : resolve('./');

// cognitiveModelsFile validation
const cognitiveModelsFilePath: string = args.cognitiveModelsFile || join(outFolder, (args.ts ? join('src', 'cognitivemodels.json') : 'cognitivemodels.json'));
cognitiveModelsFile = cognitiveModelsFilePath;

// dispatchFolder validation
dispatchFolder = args.dispatchFolder ? sanitizePath(args.dispatchFolder) : join(outFolder, 'Deployment', 'Resources', 'Dispatch', languageCode);

// lgOutFolder validation
lgOutFolder = args.lgOutFolder ? sanitizePath(args.lgOutFolder) : join(outFolder, (args.ts ? join('src', 'Services') : 'Services'));

// dispatchName validation
if (!args.dispatchName) {
    // try get the dispatch name from the cognitiveModels file
    const cognitiveModels: ICognitiveModel = JSON.parse(readFileSync(cognitiveModelsFilePath, 'UTF8'));
    dispatchName = cognitiveModels.cognitiveModels[languageCode].dispatchModel.name;
} else {
    dispatchName = args.dispatchName;
}

// End of arguments validation

// Initialize an instance of IRefreshConfiguration to send the needed arguments to the refreshskill function
const configuration: IRefreshConfiguration = {
    dispatchName: dispatchName,
    dispatchFolder: dispatchFolder,
    language: language,
    lgLanguage: lgLanguage,
    outFolder: outFolder,
    lgOutFolder: lgOutFolder,
    cognitiveModelsFile: cognitiveModelsFile,
    logger: logger
};

new RefreshSkill(logger).refreshSkill(configuration);
