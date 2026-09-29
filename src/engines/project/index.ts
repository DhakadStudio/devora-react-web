import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '../../lib/supabase'
import type { Database, Json } from '../../lib/types/db.generated'

export interface ProjectRequirement {
  label: string
  hint?: string
}

export interface GuidedProject {
  id: string
  moduleId: string
  title: string
  brief: string | null
  guideLevel: string
  rubric: ProjectRequirement[]
}

type DbClient = SupabaseClient<Database>

const PROJECT_COLUMNS = 'id, module_id, title, brief, rubric, guide_level'

function parseRubric(value: Json): ProjectRequirement[] {
  if (!Array.isArray(value)) return []
  const requirements: ProjectRequirement[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    const label = record['label']
    if (typeof label !== 'string') continue
    const hint = record['hint']
    requirements.push(typeof hint === 'string' ? { label, hint } : { label })
  }
  return requirements
}

export async function getProject(projectId: string): Promise<GuidedProject | null> {
  const client = getSupabase()
  if (!client) return null
  try {
    const { data, error } = await (client as unknown as DbClient)
      .from('projects')
      .select(PROJECT_COLUMNS)
      .eq('id', projectId)
      .limit(1)
      .maybeSingle()
    if (error) return null
    if (data === null) return null
    return {
      id: data.id,
      moduleId: data.module_id,
      title: data.title,
      brief: data.brief,
      guideLevel: data.guide_level,
      rubric: parseRubric(data.rubric)
    }
  } catch {
    return null
  }
}

export async function getProjectForModule(moduleId: string): Promise<GuidedProject | null> {
  const client = getSupabase()
  if (!client) return null
  try {
    const { data, error } = await (client as unknown as DbClient)
      .from('projects')
      .select(PROJECT_COLUMNS)
      .eq('module_id', moduleId)
      .limit(1)
      .maybeSingle()
    if (error) return null
    if (data === null) return null
    return {
      id: data.id,
      moduleId: data.module_id,
      title: data.title,
      brief: data.brief,
      guideLevel: data.guide_level,
      rubric: parseRubric(data.rubric)
    }
  } catch {
    return null
  }
}

export async function submitProject(
  userId: string,
  projectId: string,
  artifact: string
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabase()
  if (!client) return { ok: false, error: 'supabase client is unavailable' }
  try {
    const { error } = await (client as unknown as DbClient)
      .from('project_submissions')
      .insert({
        user_id: userId,
        project_id: projectId,
        status: 'submitted',
        submitted_artifact: artifact
      })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'failed to submit project' }
  }
}
