# Scripts Directory

This directory contains scripts and configuration files for the Task Master AI project.

## Files

- `PRD.txt` - Product Requirements Document (create this file with your project requirements)
- `example_prd.txt` - Example PRD template to get you started

## Usage

1. Create your PRD.txt file with your project requirements
2. Use the task-master CLI or MCP tools to parse your PRD and generate tasks
3. Manage your tasks through the generated tasks.json file

## Example Commands

```bash
# Parse your PRD and generate tasks
task-master parse-prd scripts/PRD.txt

# List all tasks
task-master list

# Show next task to work on
task-master next
``` 