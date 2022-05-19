# comma webapps

This mono-repository contains the web applications and packages for the web UIs of comma.ai

## Contributing

Just pick something and work on it. Take liberties or don't. There are three basic acceptance criterias:

1. It works as good or better
2. We use TypeScript when possible
3. Packages should be isomorphic and conform to shared eslint/tsconfig

## Status

| Package                 | New Package      | Started | Functional | Has Testing |
| ----------------------- | ---------------- | :-----: | :--------: | :---------: |
| `cabana`                | `apps/cabana`    |   ✅    |            |             |
| `connect`               | `apps/connect`   |         |            |             |
| `@commaai/comma-api`    | `packages/api`   |   ✅    |     ✅     |             |
| `@commai/my-comma-auth` | `packages/auth`  |         |            |             |
| `can-message`           | `packages/can`   |   ✅    |     ✅     |             |
| `@commaai/pandajs`      | `packages/panda` |   ✅    |     ✅     |             |
| `@commaai/log_reader`   | `packages/rlog`  |         |            |             |

## New Packages

| Package             | Description                                        | PoC | Has Testing |
| ------------------- | -------------------------------------------------- | :-: | :---------: |
| `packages/config`   | Shared, inheritable `eslint`, `jest`, etc          | ✅  |             |
| `packages/design`   | Shared UI components built with `@chakra-ui/react` | ✅  |             |
| `packages/tsconfig` | Shared, inheritable `tsconfig` configs             | ✅  |             |

## Running Locally

To run all of the apps, run:

```bash
npm install
npm run build # TODO: we shouldn't have to do this
npm run dev
```

The monorepo relies heavily on [workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces). To add a 3rd party package to a particular app (`cabana`, for example) run:

```bash
npm install @awesome/package -w cabana
```

To add an internal package (`panda` for example) to another package, add the following line to the `package.json`:

```json
{
  "panda": "*"
}
```

The `"*"` character is a shorthand that `turborepo` uses to say "this is an internal package".
