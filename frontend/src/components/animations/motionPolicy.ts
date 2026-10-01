import { createContext, useContext } from 'react'

export interface MotionPolicy { reduced: boolean; compact: boolean; finePointer: boolean; paused: boolean }
// Isolated/unwrapped consumers stay stationary rather than guessing device capabilities.
export const MotionPolicyContext = createContext<MotionPolicy>({ reduced: true, compact: true, finePointer: false, paused: false })
export function useMotionPolicy() { return useContext(MotionPolicyContext) }
