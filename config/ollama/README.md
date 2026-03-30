# Ollama Modelfiles

Custom Ollama model definitions for HomeForge. Each `.Modelfile` in this directory is automatically built when `./boom.sh` runs.

## Adding a new model

1. Create `your-model-name.Modelfile` in this directory
2. Use standard Ollama Modelfile syntax:
   ```
   FROM <base-model>        # e.g. llama3.2, mistral, gemma2
   SYSTEM """your system prompt"""
   PARAMETER temperature 0.7
   ```
3. Run `./boom.sh` — your model will appear in Open-WebUI automatically

## Built-in models

| Model | Base | Purpose |
|-------|------|---------|
| `homelab-assistant` | llama3.2 | HomeForge-aware assistant with full stack context |

## Manual build

```bash
docker exec project-s-ollama ollama create homelab-assistant -f /modelfiles/homelab-assistant.Modelfile
```
