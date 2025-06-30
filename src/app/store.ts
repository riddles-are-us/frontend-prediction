import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit';

// 简单的空reducer，防止Redux报错
const emptyReducer = (state = {}, action: any) => state;

// 移除SDK Redux依赖，项目使用自己的轻量级状态管理
export const store = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // 保留一些基本的忽略配置
        ignoredActionPaths: [
          'payload.web3',
          'payload.seed', 
          'payload.injector', 
          'payload.pubkey',
          'meta.arg.cmd'
        ],
      },
    }),
  reducer: {
    // 添加空reducer防止Redux报错
    app: emptyReducer,
    // 这里可以添加项目自己的reducers
    // 现在暂时为空，SDK状态通过hooks管理
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>; 