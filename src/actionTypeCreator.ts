export namespace KZ {
    export class ActionTypeCreatorSetup<TAsync extends string> {
        constructor (public types: TAsync[]) {}

        createActionBuilder<T> (builderName: string) {
            return new ActionTypeCreator<T, TAsync>(builderName, this);
        }
    }

    export class ActionTypeCreator<TType, TAsync extends string = null> {

        private actions: TType = {} as any;

        constructor (private baseName: string, private setup: ActionTypeCreatorSetup<TAsync> = null) { }

        addBasic<KAction extends string, TA extends string = null> (name: KAction) {
            let newThis = this as unknown as ActionTypeCreator<Record<KAction, string>, TAsync>;
            newThis.actions[name] = this.baseName + '_' + name;
            return newThis as ActionTypeCreator<TType & Record<KAction, string>, TAsync>;
        }

        add<KAction extends string, TA extends string> (name: KAction, ...actions: TA[]) {
            let newThis = this as unknown as ActionTypeCreator<Record<KAction, { [K in TA]: string }>, TAsync>;
            newThis.actions[name] = this.create(name, actions);
            return newThis as ActionTypeCreator<TType & Record<KAction, { [K in TA]: string }>, TAsync>;
        }

        addAsync<KAction extends string, TA extends string | TAsync = TAsync> (name: KAction, ...actions: TA[]) {
            let newThis = this as unknown as ActionTypeCreator<Record<KAction, { [K in TA | TAsync]: string }>, TAsync>;
            let asyncSetupTypes = [];
            if (newThis.setup) asyncSetupTypes = newThis.setup.types;
            const combinedActions = [...asyncSetupTypes, ...actions];
            newThis.actions[name] = this.create(name, combinedActions);
            return newThis as ActionTypeCreator<TType & Record<KAction, { [K in TA | TAsync]: string }>, TAsync>;
        }

        debug () {
            console.groupCollapsed(this.baseName);
            console.log(this.actions);
            console.groupEnd();
            return this;
        }

        build (): TType {
            return this.actions;
        }

        private create<T extends string> (name: string, actions: T[]) {
            return actions.reduce((acc, action) => {
                acc[action] = this.baseName + '_' + name + '_' + action;
                return acc;
            }, {} as any);
        }
    }
}