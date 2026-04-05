// Re-export all types from @types/better-sqlite3 under the multiple-ciphers package name.
// better-sqlite3-multiple-ciphers has an identical API — only the encryption layer differs.
declare module 'better-sqlite3-multiple-ciphers' {
  export { default } from 'better-sqlite3'
  export * from 'better-sqlite3'
}
