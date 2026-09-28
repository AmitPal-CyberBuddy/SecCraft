const API_BASE = "/api"

export interface ModuleLesson {
  id: string
  title: string
  kind: string
}

export interface Module {
  id: string
  title: string
  phase: number
  difficulty: string
  estimated_hours: number
  prerequisites: string[]
  /** Legacy convenience flag derived from lab_requirement. */
  status: "simulated" | "hardware" | "locked"
  /** SIMULATION | HYBRID | RF_REQUIRED — see docs/SIMULATION_VS_HARDWARE.md */
  lab_requirement?: string
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

export async function fetchModules(): Promise<Module[]> {
  try {
    const res = await fetch(`${API_BASE}/modules`)
    if (!res.ok) throw new Error("API not available")
    return await res.json()
  } catch {
    // Fallback to local content
    const modules = await import("../content/modules.json")
    return modules.default as Module[]
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

export async function fetchLessonContent(moduleId: string, lessonId: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/content/${moduleId}/${lessonId}`)
    if (res.ok) return await res.text()
  } catch {}
  // Fallback: try local markdown
  try {
    const mod = await import(`../content/lessons/${moduleId}/${lessonId}.md?raw`)
    return mod.default
  } catch {
    return `# ${lessonId}\n\nContent not yet available. This lesson is part of the upcoming module.`
  }
}
