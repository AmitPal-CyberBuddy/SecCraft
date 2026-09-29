const API_BASE = "/api"

export interface ModuleLesson {
  id: string
  title: string
  kind: string
}

export interface Module {
  id: string
  learningPathId?: string
  title: string
  phase: number
  phaseName?: string
  difficulty: string
  estimated_hours: number
  prerequisites: string[]
  /** Legacy convenience flag derived from lab_requirement. */
  status: "simulated" | "hardware" | "locked"
  /** SIMULATION | HYBRID | RF_REQUIRED | REAL — see docs/SIMULATION_VS_HARDWARE.md */
  lab_requirement?: string
  lab_requirement_generic?: string
  content_status?: string
  skills: string[]
  description?: string
  objectives?: string[]
  artifacts?: string[]
  decision_practice?: string[]
  evidence_focus?: string
  retest_focus?: string
  lessons?: ModuleLesson[]
  labs?: string[]
  progress?: number
}

export interface LearningPath {
  id: string
  title: string
  shortTitle: string
  description: string
  longDescription: string
  category: string
  icon: string
  color: string
  difficulty: string
  estimatedHours: number
  prerequisites: string[]
  status: 'available' | 'coming-soon' | 'planned'
  featured: boolean
  modules: string[]
  skills: string[]
  labs: number
  challenges: number
  certificate: boolean
  tagline?: string
  legacyBrand?: string
}

export async function fetchModules(pathId?: string): Promise<Module[]> {
  try {
    const url = pathId ? `${API_BASE}/modules?path=${encodeURIComponent(pathId)}` : `${API_BASE}/modules`
    const res = await fetch(url)
    if (!res.ok) throw new Error("API not available")
    return await res.json()
  } catch {
    const modules = await import("../content/modules.json")
    const list = modules.default as Module[]
    if (pathId) return list.filter(m => (m as any).learningPathId === pathId)
    return list
  }
}

export async function fetchModule(id: string): Promise<Module | null> {
  try {
    const res = await fetch(`${API_BASE}/modules/${id}`)
    if (!res.ok) throw new Error("not found")
    return await res.json()
  } catch {
    const modules = await import("../content/modules.json")
    const list = modules.default as Module[]
    return list.find(m => m.id === id) || null
  }
}

export async function fetchLearningPaths(): Promise<LearningPath[]> {
  try {
    const res = await fetch(`${API_BASE}/learning-paths`)
    if (!res.ok) throw new Error("API not available")
    return await res.json()
  } catch {
    const paths = await import("../content/learning-paths.json")
    return paths.default as LearningPath[]
  }
}

export async function fetchLearningPath(id: string): Promise<LearningPath | null> {
  try {
    const res = await fetch(`${API_BASE}/learning-paths/${id}`)
    if (!res.ok) throw new Error("not found")
    return await res.json()
  } catch {
    const paths = await import("../content/learning-paths.json")
    const list = paths.default as LearningPath[]
    return list.find(p => p.id === id) || null
  }
}

export async function fetchLessonContent(moduleId: string, lessonId: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/content/${moduleId}/${lessonId}`)
    if (res.ok) return await res.text()
  } catch {}
  try {
    const mod = await import(`../content/lessons/${moduleId}/${lessonId}.md?raw`)
    return mod.default
  } catch {
    return `# ${lessonId}\n\nContent not yet available. This lesson is part of the upcoming module.`
  }
}

export async function fetchPlatform() {
  try {
    const res = await fetch(`${API_BASE}/platform`)
    if (res.ok) return await res.json()
  } catch {}
  const plat = await import("../content/platform.json")
  return plat.default
}
