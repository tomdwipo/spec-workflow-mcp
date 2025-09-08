# Spec-Workflow MCP Server Container

This directory contains Docker configuration files to run the Spec-Workflow MCP server in a containerized environment. This setup allows you to run the MCP server and dashboard in Docker containers, providing isolation and easy deployment.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for dashboard deployment)
- A project directory where you want to use spec-workflow

## Quick Start

### Building the Container

From the containers directory, build the Docker image:

```bash
docker build -t spec-workflow-mcp .
```

## MCP Server Configuration

### For Claude Desktop or other MCP clients

Create or update the `.mcp.json` file in your project root with the following configuration:

```json
{
    "mcpServers": {
      "spec-workflow": {
        "command": "docker",
        "args": [
          "run", "--rm", "-i",
          "-v", "./.spec-workflow:/home/username/project/.spec-workflow:rw",
          "--entrypoint=node",
          "spec-workflow-mcp:latest",
          "/app/dist/index.js", "./"
        ]
      }
    }
  }

```

## Important Configuration Notes

### Path Mapping Requirements

The container requires the `.spec-workflow` directory to be mounted at the **exact same path** inside the container as it exists on your host system. This is critical for the MCP server to function correctly.

**Example:** If your project is at `/home/steev/tabletopsentinel.com`, your configuration would be:

```json
{
    "mcpServers": {
      "spec-workflow": {
        "command": "docker",
        "args": [
          "run", "--rm", "-i",
          "-v", "./.spec-workflow:/home/steev/tabletopsentinel.com/.spec-workflow:rw",
          "--entrypoint=node",
          "spec-workflow-mcp:latest",
          "/app/dist/index.js", "./"
        ]
      }
    }
}
```

### Key Configuration Points

- **Path Consistency**: The container path must match your host path exactly
- **Volume Mount**: Only the `.spec-workflow` directory needs to be mounted
- **Auto-creation**: The `.spec-workflow` directory will be created if it doesn't exist
- **SELinux Note**: If you're using SELinux, you may need to add `:z` to the volume mount (e.g., `:rw,z`)

## Dashboard Deployment

The dashboard can be run separately from the MCP server using Docker Compose. This is useful if you're not using the VSCode extension.

### Important Environment Variables

- `SPEC_WORKFLOW_PATH`: Must match the project path used in the MCP server configuration
- `DASHBOARD_PORT`: The port to expose the dashboard on (default: 3000)

### Using Docker Compose

Start the dashboard with default settings:

```bash
# Replace with your actual project path
SPEC_WORKFLOW_PATH=/home/username/project docker-compose up -d
```

Start the dashboard on a custom port:

```bash
DASHBOARD_PORT=3456 SPEC_WORKFLOW_PATH=/home/username/project docker-compose up -d
```

Access the dashboard at:
- Default: `http://localhost:3000`
- Custom port: `http://localhost:YOUR_PORT`

### Stopping the Dashboard

```bash
docker-compose down
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the `.spec-workflow` directory has proper permissions
2. **Port Already in Use**: Choose a different port using the `DASHBOARD_PORT` variable
3. **Path Not Found**: Verify that your `SPEC_WORKFLOW_PATH` matches your actual project location
4. **SELinux Issues**: On SELinux-enabled systems, add `:z` to volume mounts

### Logs and Debugging

View container logs:
```bash
docker-compose logs -f
```

Check container status:
```bash
docker ps
```
