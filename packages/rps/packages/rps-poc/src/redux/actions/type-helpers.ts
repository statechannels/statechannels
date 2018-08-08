// ref: https://medium.com/@martin_hotell/improved-redux-type-safety-with-typescript-2-8-2c11a8062575

type FunctionType = (...args: any[]) => any;
interface ActionCreatorsMapObject { [actionCreator: string]: FunctionType };


export type ActionsUnion<A extends ActionCreatorsMapObject> = ReturnType<A[keyof A]>;
