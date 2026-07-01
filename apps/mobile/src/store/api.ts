import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  selfProfileSchema,
  type SelfProfile,
  type AuthSession,
  type LoginRequest,
  type RegisterRequest,
} from '@ingame/shared';
import type { RootState } from './index';

// F31 — RTK Query bound to the shared zod schemas (the executable api-contract). Request + response
// types are the `z.infer` types from @ingame/shared; getMe additionally PARSES the response with the
// schema so a FE↔BE shape drift is caught at the seam, not deep in a component. The access token is
// attached from the in-memory auth slice (rehydrated from expo-secure-store, F14).

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.accessToken;
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Me'],
  endpoints: (build) => ({
    register: build.mutation<AuthSession, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    login: build.mutation<AuthSession, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    getMe: build.query<SelfProfile, void>({
      query: () => '/me',
      providesTags: ['Me'],
      transformResponse: (raw): SelfProfile => selfProfileSchema.parse(raw),
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation, useGetMeQuery } = api;
