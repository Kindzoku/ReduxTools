export namespace KZ {
    type ReducerSetup<TTypes> = Partial<{
        /**
         * Вывод отладочной информации
         * boolean = true - выводить всю информацию
         * string - информация о конкретном экшене
         * string[] - информация о экшенах
         */
        debug: boolean | string | string[];

        /**
         * Метод нормализации entity
         */
        entityNormalizer: ReducerEntityNormalizer;

        /**
         * Обработка экшенов
         */
        processingRules: ReducerActionProcessors<TTypes & IRequestTypes>;

        updateType: SliceUpdateType;
    }>;

    export interface ISliceBuilderOptions {
        updateType: SliceUpdateType;
    }

    export enum SliceUpdateType { Self, Map, Array }

    export class ReducerBuilder<TState, TTypes> {

        private setup: ReducerSetup<TTypes> = {
            debug: false,
            processingRules: {
                START: (slice) => Redux.setLoading(slice),
                ERROR: (slice) => Redux.setLoadingError(slice),
                END: (slice, action, entity, updateType: SliceUpdateType) => {
                    slice = Redux.setLoaded(slice);
                    if (updateType === SliceUpdateType.Map || updateType === SliceUpdateType.Array) {
                        return R.assoc('items', entity, slice);
                    }
                    return R.mergeDeepRight(slice, entity);
                }
            } as any,
            updateType: SliceUpdateType.Map
        };

        /**
         * Коструктор
         * @param types - типы поддерживаемые reducer'ом
         * @param path - строковая последовательность - путь до фрагмента, или функция для вычисления
         * @param options - опции
         */
        public constructor (
            private types: TTypes,
            private path: ReducerPathOrResolver = [],
            private readonly options?: Partial<ISliceBuilderOptions>
        ) {
            if (options) {
                this.setup.updateType = options.updateType;
            }
        }

        /**
         * Выключение обработок по умолчанию
         * @param omit
         */
        public omitDefaults<K extends keyof IRequestTypes> (...omit: K[]): this {
            for (let key of omit) {
                delete this.setup.processingRules[key];
            }
            return this;
        }

        /**
         * Индексировать то, что в entity по этому полю
         * @param propertyName
         */
        public indexEntity = (propertyName: string): this => {
            this.setup.entityNormalizer = (entity: any[]) => R.indexBy(R.prop(propertyName), entity);
            return this;
        };

        public setEntityNormalizer = (normalizer: ReducerEntityNormalizer): this => {
            this.setup.entityNormalizer = normalizer;
            return this;
        };

        /**
         * Добавляет правило обработки action
         * @param actionTypeKey - ключ action
         * @param rule - правило
         */
        public addRule = (actionTypeKey: keyof (TTypes & IRequestTypes), rule: ReducerActionProcessor): this => {
            this.setup.processingRules[actionTypeKey] = rule;
            return this;
        };

        public debug (flag: boolean | string | string[]) {
            this.setup.debug = flag;
            return this;
        }

        public build () {
            return new Reducer<TState, TTypes>(this.types, this.path, this.setup);
        }
    }

    class Reducer<TState, TTypes> {

        constructor (
            private types: TTypes,
            private path: ReducerPathOrResolver,
            private setup: ReducerSetup<TTypes>
        ) {}

        /**
         * Проверяет - должно ли выполняться условие
         * @param action
         */
        public isValideType = (action: IReduxAction<any>): boolean => R.pipe(
            R.values,
            R.any(R.equals(action.type))
        )(this.types);

        public update = (state: TState, action: IReduxAction<any>): TState => {
            if (this.isDebugOn(action.type)) window.$log.success(action.type, {state, action});

            const keyOfCaseSetupAction = this.getKeyByActionName(action.type);

            if (!keyOfCaseSetupAction) {
                console.error(`Unable to find action for ${action.type}`);
                return state;
            }

            const extractedEntity = R.path(['payload', 'entity'], action);
            let normalizedEntity = extractedEntity;
            if (extractedEntity && this.setup.entityNormalizer) normalizedEntity = this.setup.entityNormalizer(extractedEntity);

            const rules = this.setup.processingRules || {};

            /** обработка для текущего экшена */
            let rule = rules[keyOfCaseSetupAction] as ReducerActionProcessor;
            return this.modifySliceMethod(rule, state, action, normalizedEntity);
        };

        /** получение ключа экшена по имени */
        private getKeyByActionName (actionName) {
            const rules = this.setup.processingRules;
            return R.pipe(
                R.keys,
                R.find(key => this.types[key] === actionName)
            )(rules);
        }

        /** нужен ли дебаг */
        private isDebugOn = (actionName): boolean => {
            let actionKey = '';
            try {
                actionKey = this.getKeyByActionName(actionName);
            } catch (e) { return false; }

            let debug = this.setup.debug;
            if (typeof debug === 'undefined') return false;
            if (typeof debug === 'boolean') return debug;
            if (typeof debug === 'string') debug = [debug];
            if (!Array.isArray(debug)) return false;
            return R.any(R.equals(actionKey), debug);
        };

        /** расчёт пути до фрагмента стейта */
        private getPath = (action): string[] => {
            if (isSliceBuilderPath(this.path)) {
                return this.path;
            }
            if (isSliceBuilderPathResolver(this.path)) {
                return this.path(action.payload);
            }
            return [];
        };

        /** метод модификации фрагмента стейта */
        private modifySliceMethod = (fn: ReducerActionProcessor, state, action: GenericAction, entity) => {
            let path = this.getPath(action);

            if (path.length === 0) {
                /** если path - null, значит применяем функцию-модификатор к себе */
                return fn(state, action, entity, this.setup.updateType);
            } else {
                /** если path не null, значит получаем фрагмент, применяем к нему функцию-модификатор, заменяем фрагмент - изменённым */
                let sliceState = R.pathOr({}, path as string[], state);
                sliceState = fn(sliceState, action, entity, this.setup.updateType);
                return R.assocPath(path as string[], sliceState, state);
            }
        };
    }
}