import {ConstantProvider as BaseConstantProvider} from '../common/constants.js';

export class ConstantProvider extends BaseConstantProvider{
    constructor() {
        // Set up all of the constants from the base provider.
        super();

        console.log("ConstantProvider call!");
    }
}