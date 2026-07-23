import { frameRegistry } from "../../components/frames/registry"
import { PluginManifest } from "./types"
import { PageFrame } from "../../components/frames/types"
import { getPluginSubpathEntry, toFileUrl } from "./gitLoader"
import { dynamicImport } from "./dynamicImport"

export async function loadFramesFromPackage(
  pluginName: string,
  manifest: PluginManifest | null,
): Promise<void> {
  if (!manifest?.frames) return

  try {
    const framesPath = getPluginSubpathEntry(pluginName, "./frames")

    let framesModule: Record<string, unknown>
    if (framesPath) {
      framesModule = await dynamicImport<Record<string, unknown>>(toFileUrl(framesPath))
    } else {
      framesModule = await dynamicImport<Record<string, unknown>>(`${pluginName}/frames`)
    }

    for (const [exportName, _frameMeta] of Object.entries(manifest.frames)) {
      const frame = framesModule[exportName]
      if (!frame) {
        console.warn(
          `Frame "${exportName}" declared in manifest but not found in ${pluginName}/frames`,
        )
        continue
      }

      const pageFrame = frame as PageFrame
      if (!pageFrame.name || typeof pageFrame.render !== "function") {
        console.warn(
          `Frame "${exportName}" from ${pluginName} is not a valid PageFrame (missing name or render)`,
        )
        continue
      }

      // Register under the frame's declared name
      frameRegistry.register(pageFrame.name, pageFrame, pluginName)
    }
  } catch {
    if (manifest.frames && Object.keys(manifest.frames).length > 0) {
      console.warn(`Plugin "${pluginName}" declares frames but failed to load them`)
    }
  }
}
