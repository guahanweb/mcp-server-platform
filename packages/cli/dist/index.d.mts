declare function initCommand(name?: string, options?: any): Promise<void>;

declare function createPluginCommand(name: string, options?: any): Promise<void>;

declare function addToolCommand(name: string, options?: any): Promise<void>;

export { addToolCommand, createPluginCommand, initCommand };
