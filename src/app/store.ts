import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit';
import { AccountSliceReducer } from 'zkwasm-minirollup-browser';

export const store = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'account/deriveL2Account/fulfilled', 
          'account/loginL1AccountAsync/fulfilled',
          'acccount/deriveL2Account/fulfilled', // Note: this has a typo in the original zkwasm code
        ],
        ignoredActionPaths: [
          'payload.web3',
          'payload.seed', 
          'payload.injector', 
          'payload.pubkey', // Ignore the BN pubkey object
          'meta.arg.cmd'
        ],
        ignoredPaths: [
          "account/fetchAccount/fulfilled",
          "account.l1Account.web3",
          "account.l2account",
          "account.l2account.pubkey" // Ignore the BN pubkey in state
        ],
      },
    }),
  reducer: {
    account: AccountSliceReducer,
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