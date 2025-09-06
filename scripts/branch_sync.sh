#!/bin/bash

# Branch Synchronization Protocol
# Orchestrator's tool for managing multi-branch workflow

MAIN_BRANCH="main"
AGENT_PREFIX="agent/"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

sync_agent_branch() {
    local agent=$1
    local branch="${AGENT_PREFIX}${agent}"
    
    log "Syncing $branch with $MAIN_BRANCH..."
    
    git checkout "$branch" 2>/dev/null
    if [ $? -eq 0 ]; then
        git merge "$MAIN_BRANCH" --no-ff -m "Sync: Pull tasks from orchestrator"
        git checkout "$MAIN_BRANCH"
        log "✓ $branch synced"
    else
        log "✗ Failed to sync $branch"
    fi
}

merge_agent_results() {
    local agent=$1
    local branch="${AGENT_PREFIX}${agent}"
    
    log "Merging results from $branch..."
    
    git checkout "$MAIN_BRANCH"
    git merge "$branch" --no-ff -m "Results: Integrate $agent outputs"
    
    if [ $? -eq 0 ]; then
        log "✓ Successfully merged $agent results"
    else
        log "✗ Merge conflict with $agent - manual resolution required"
        return 1
    fi
}

broadcast_task() {
    local task_file=$1
    
    log "Broadcasting task to all agents..."
    
    for agent in data-processor file-manager monitor security builder tester; do
        branch="${AGENT_PREFIX}${agent}"
        git checkout "$branch" 2>/dev/null
        if [ $? -eq 0 ]; then
            cp "$task_file" "tasks/${agent}_task.json"
            git add "tasks/${agent}_task.json"
            git commit -m "Task: Assigned to $agent"
            log "✓ Task sent to $agent"
        fi
    done
    
    git checkout "$MAIN_BRANCH"
}

parallel_sync() {
    log "Starting parallel synchronization..."
    
    for agent in data-processor file-manager monitor security builder tester; do
        sync_agent_branch "$agent" &
    done
    
    wait
    log "Parallel sync complete"
}

collect_all_results() {
    log "Collecting results from all agents..."
    
    for agent in data-processor file-manager monitor security builder tester; do
        merge_agent_results "$agent"
    done
    
    log "All results collected"
}

branch_health_check() {
    log "Performing branch health check..."
    
    local healthy=0
    local total=0
    
    for agent in data-processor file-manager monitor security builder tester; do
        branch="${AGENT_PREFIX}${agent}"
        total=$((total + 1))
        
        if git show-ref --verify --quiet "refs/heads/$branch"; then
            healthy=$((healthy + 1))
            echo "  ✓ $branch: healthy"
        else
            echo "  ✗ $branch: missing"
        fi
    done
    
    log "Branch health: $healthy/$total operational"
}

case "$1" in
    sync)
        sync_agent_branch "$2"
        ;;
    merge)
        merge_agent_results "$2"
        ;;
    broadcast)
        broadcast_task "$2"
        ;;
    parallel-sync)
        parallel_sync
        ;;
    collect)
        collect_all_results
        ;;
    health)
        branch_health_check
        ;;
    *)
        echo "Usage: $0 {sync|merge|broadcast|parallel-sync|collect|health} [agent]"
        exit 1
        ;;
esac