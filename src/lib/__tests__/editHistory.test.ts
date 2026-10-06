import { beforeEach, describe, expect, it } from 'vitest'
import { captureSnapshot, makeDesignDefaults, useDesignStore, type DesignSnapshot } from '../../store/useDesignStore'
import { EDIT_HISTORY_LIMIT, recordEdit, redoEdit, resetEditHistory, undoEdit, useEditHistory } from '../editHistory'

const snap = () => captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot)
const edit = (name: string) => {
  recordEdit(snap(), `rename ${name}`)
  useDesignStore.setState({ projectName: name })
}

describe('edit history', () => {
  beforeEach(() => {
    useDesignStore.setState({ ...makeDesignDefaults(), projectName: 'start' })
    resetEditHistory()
  })

  it('undoes several edits in order, then redoes them', () => {
    edit('a'); edit('b'); edit('c')
    expect(undoEdit()).toBe('rename c')
    expect(useDesignStore.getState().projectName).toBe('b')
    undoEdit(); undoEdit()
    expect(useDesignStore.getState().projectName).toBe('start')
    expect(undoEdit()).toBeNull()
    redoEdit(); redoEdit()
    expect(useDesignStore.getState().projectName).toBe('b')
  })

  it('a new edit after an undo drops the redo stack', () => {
    edit('a'); edit('b')
    undoEdit()
    edit('x')
    expect(redoEdit()).toBeNull()
    expect(useDesignStore.getState().projectName).toBe('x')
  })

  it(`keeps at most ${EDIT_HISTORY_LIMIT} steps`, () => {
    for (let i = 0; i < EDIT_HISTORY_LIMIT + 5; i++) edit(`n${i}`)
    expect(useEditHistory.getState().past).toHaveLength(EDIT_HISTORY_LIMIT)
  })
})
