export function dynamicImport<T = unknown>(specifier: string): Promise<T> {
  return new Function("specifier", "return import(specifier)")(specifier) as Promise<T>
}
