import { KZ } from './src/actionTypeCreator';

const asyncCreator = new KZ.ActionTypeCreatorSetup(['START', 'END', 'ERROR']);
const REDDIT = asyncCreator.createActionBuilder('REDDIT')
    .addAsync('LOAD_NEW')
    .addAsync('DELETE', 'OTHER_ACTION')
    .add('READ', 'ARTICLE', 'BY_USER')
    .addBasic('MARK_ALL')
    .build();

REDDIT.LOAD_NEW.START;
REDDIT.DELETE.OTHER_ACTION;
REDDIT.MARK_ALL;
REDDIT.READ.ARTICLE;