export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

export const createFileTree = (files: Record<string, string>): FileNode[] => {
  const tree: FileNode[] = [];
  const pathMap: Record<string, FileNode> = {};

  // Создаем корневую папку проекта
  const rootNode: FileNode = {
    name: 'everest-ai-editor',
    path: '/',
    type: 'folder',
    children: [],
    isOpen: true
  };
  tree.push(rootNode);
  pathMap['/'] = rootNode;

  // Обрабатываем каждый файл
  Object.keys(files).forEach(filePath => {
    const parts = filePath.split('/').filter(part => part.length > 0);
    let currentPath = '/';
    let currentNode = rootNode;

    // Создаем папки по пути
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      const folderPath = currentPath + (currentPath === '/' ? '' : '/') + folderName + '/'; // всегда с / как папка

      if (!pathMap[folderPath]) {
        const folderNode: FileNode = {
          name: folderName,
          path: folderPath,
          type: 'folder',
          children: [],
          isOpen: true
        };

        if (currentNode.children) {
          currentNode.children.push(folderNode);
        }
        pathMap[folderPath] = folderNode;
      }

      currentPath = folderPath;
      currentNode = pathMap[folderPath];
    }

    // Крайний компонент — папка или файл
    if (filePath.endsWith('/') && files[filePath] === '__folder__') {
      // Это папка, а не файл
      const folderName = parts[parts.length - 1];
      const folderPath = filePath; // уже имеет трейлинг слэш
      if (!pathMap[folderPath]) {
        const folderNode: FileNode = {
          name: folderName,
          path: folderPath,
          type: 'folder',
          children: [],
          isOpen: true
        };
        if (currentNode.children) {
          currentNode.children.push(folderNode);
        }
        pathMap[folderPath] = folderNode;
      }
      // Всё.
      return;
    }

    // Создаем файл
    const fileName = parts[parts.length - 1];
    const fileNode: FileNode = {
      name: fileName,
      path: filePath,
      type: 'file',
      content: files[filePath]
    };

    if (currentNode.children) {
      currentNode.children.push(fileNode);
    }
  });

  return tree;
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const getLanguageFromExtension = (extension: string): string => {
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'd.ts': 'typescript',
    
    // Python
    'py': 'python',
    'pyw': 'python',
    'pyi': 'python',
    'pyc': 'python',
    'pyo': 'python',
    'pyd': 'python',
    
    // Java
    'java': 'java',
    'class': 'java',
    'jar': 'java',
    'war': 'java',
    'ear': 'java',
    
    // C/C++
    'c': 'c',
    'h': 'c',
    'cpp': 'cpp',
    'cxx': 'cpp',
    'cc': 'cpp',
    'c++': 'cpp',
    'hpp': 'cpp',
    'hxx': 'cpp',
    'h++': 'cpp',
    
    // C#
    'cs': 'csharp',
    'csx': 'csharp',
    
    // PHP
    'php': 'php',
    'phtml': 'php',
    'php3': 'php',
    'php4': 'php',
    'php5': 'php',
    'phps': 'php',
    
    // Ruby
    'rb': 'ruby',
    'rbw': 'ruby',
    'rake': 'ruby',
    'gemspec': 'ruby',
    
    // Go
    'go': 'go',
    
    // Rust
    'rs': 'rust',
    
    // Swift
    'swift': 'swift',
    
    // Kotlin
    'kt': 'kotlin',
    'kts': 'kotlin',
    
    // Scala
    'scala': 'scala',
    'sc': 'scala',
    
    // Haskell
    'hs': 'haskell',
    'lhs': 'haskell',
    
    // Clojure
    'clj': 'clojure',
    'cljs': 'clojure',
    'cljc': 'clojure',
    'edn': 'clojure',
    
    // Erlang
    'erl': 'erlang',
    'hrl': 'erlang',
    
    // Elixir
    'ex': 'elixir',
    'exs': 'elixir',
    
    // F#
    'fs': 'fsharp',
    'fsi': 'fsharp',
    'fsx': 'fsharp',
    
    // OCaml
    'ml': 'ocaml',
    'mli': 'ocaml',
    
    // Lisp
    'lisp': 'lisp',
    'lsp': 'lisp',
    'cl': 'lisp',
    'el': 'lisp',
    
    // Prolog
    'pl': 'prolog',
    'pro': 'prolog',
    
    // Fortran
    'f': 'fortran',
    'f90': 'fortran',
    'f95': 'fortran',
    'f03': 'fortran',
    'f08': 'fortran',
    
    // COBOL
    'cob': 'cobol',
    'cbl': 'cobol',
    'cpy': 'cobol',
    
    // Pascal
    'pas': 'pascal',
    'pp': 'pascal',
    'p': 'pascal',
    
    // Ada
    'adb': 'ada',
    'ads': 'ada',
    
    // Assembly
    'asm': 'assembly',
    's': 'assembly',
    'S': 'assembly',
    
    // Shell/Bash
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ksh': 'shell',
    'csh': 'shell',
    'tcsh': 'shell',
    
    // PowerShell
    'ps1': 'powershell',
    'psm1': 'powershell',
    'psd1': 'powershell',
    
    // Batch
    'bat': 'batch',
    'cmd': 'batch',
    
    // Web
    'html': 'html',
    'htm': 'html',
    'xhtml': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'styl': 'stylus',
    
    // Data formats
    'json': 'json',
    'jsonc': 'json',
    'json5': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'ini',
    'properties': 'properties',
    'env': 'properties',
    
    // Documentation
    'md': 'markdown',
    'markdown': 'markdown',
    'rst': 'restructuredtext',
    'tex': 'latex',
    'latex': 'latex',
    
    // Database
    'sql': 'sql',
    'mysql': 'sql',
    'pgsql': 'sql',
    'sqlite': 'sql',
    
    // Configuration
    'dockerfile': 'dockerfile',
    'dockerignore': 'ignore',
    'gitignore': 'ignore',
    'gitattributes': 'gitattributes',
    'gitmodules': 'gitmodules',
    'gitconfig': 'gitconfig',
    'gitkeep': 'gitkeep',
    
    // Build tools
    'makefile': 'makefile',
    'cmake': 'cmake',
    'cmakecache': 'cmake',
    'gradle': 'gradle',
    'maven': 'maven',
    'pom': 'maven',
    'ant': 'ant',
    'gulpfile': 'gulp',
    'webpack': 'webpack',
    'rollup': 'rollup',
    'vite': 'vite',
    'esbuild': 'esbuild',
    'swc': 'swc',
    'babel': 'babel',
    'prettier': 'prettier',
    'eslint': 'eslint',
    'stylelint': 'stylelint',
    'husky': 'husky',
    'lint-staged': 'lint-staged',
    'commitizen': 'commitizen',
    'conventional-changelog': 'conventional-changelog',
    'semantic-release': 'semantic-release',
    'renovate': 'renovate',
    'dependabot': 'dependabot',
    
    // CI/CD
    'github-actions': 'github-actions',
    'gitlab-ci': 'gitlab-ci',
    'jenkins': 'jenkins',
    'travis': 'travis',
    'circleci': 'circleci',
    'azure-pipelines': 'azure-pipelines',
    'aws-codebuild': 'aws-codebuild',
    
    // Infrastructure
    'terraform': 'terraform',
    'tf': 'terraform',
    'ansible': 'ansible',
    'puppet': 'puppet',
    'chef': 'chef',
    'salt': 'salt',
    'vagrant': 'vagrant',
    
    // Kubernetes
    'kubernetes': 'kubernetes',
    'k8s': 'kubernetes',
    'helm': 'helm',
    'istio': 'istio',
    'linkerd': 'linkerd',
    'consul': 'consul',
    'vault': 'vault',
    'nomad': 'nomad',
    
    // Monitoring
    'prometheus': 'prometheus',
    'grafana': 'grafana',
    'elasticsearch': 'elasticsearch',
    'kibana': 'kibana',
    'logstash': 'logstash',
    'beats': 'beats',
    
    // Databases
    'redis': 'redis',
    'mongodb': 'mongodb',
    'postgresql': 'postgresql',
    'cassandra': 'cassandra',
    'neo4j': 'neo4j',
    'influxdb': 'influxdb',
    'timescaledb': 'timescaledb',
    'clickhouse': 'clickhouse',
    'bigquery': 'bigquery',
    'snowflake': 'snowflake',
    'redshift': 'redshift',
    'dynamodb': 'dynamodb',
    
    // Cloud
    's3': 's3',
    'cloudfront': 'cloudfront',
    'lambda': 'lambda',
    'api-gateway': 'api-gateway',
    'ec2': 'ec2',
    'ecs': 'ecs',
    'eks': 'eks',
    'fargate': 'fargate',
    'rds': 'rds',
    'aurora': 'aurora',
    'elasticache': 'elasticache',
    'cloudwatch': 'cloudwatch',
    'x-ray': 'x-ray',
    'cloudtrail': 'cloudtrail',
    'config': 'config',
    'guardduty': 'guardduty',
    'waf': 'waf',
    'shield': 'shield',
    'inspector': 'inspector',
    'security-hub': 'security-hub',
    'macie': 'macie',
    'kms': 'kms',
    'secrets-manager': 'secrets-manager',
    'iam': 'iam',
    'cognito': 'cognito',
    'sso': 'sso',
    'organizations': 'organizations',
    'cloudformation': 'cloudformation',
    'cdk': 'cdk',
    'serverless': 'serverless',
    'sam': 'sam',
    'amplify': 'amplify',
    'chalice': 'chalice',
    'zappa': 'zappa',
    
    // Deployment
    'vercel': 'vercel',
    'netlify': 'netlify',
    'heroku': 'heroku',
    'railway': 'railway',
    'render': 'render',
    'fly': 'fly',
    'digitalocean': 'digitalocean',
    'linode': 'linode',
    'vultr': 'vultr',
    'ovh': 'ovh',
    'scaleway': 'scaleway',
    'hetzner': 'hetzner',
    'aws': 'aws',
    'azure': 'azure',
    'gcp': 'gcp',
    'ibm-cloud': 'ibm-cloud',
    'oracle-cloud': 'oracle-cloud',
    'alibaba-cloud': 'alibaba-cloud',
    'tencent-cloud': 'tencent-cloud',
    'huawei-cloud': 'huawei-cloud',
    'yandex-cloud': 'yandex-cloud',
    'vk-cloud': 'vk-cloud',
    'selectel': 'selectel',
    'timeweb': 'timeweb',
    'regru': 'regru',
    'beget': 'beget',
    'hostland': 'hostland',
    'spaceweb': 'spaceweb',
    'firstvds': 'firstvds',
    'nic': 'nic',
    'ru-center': 'ru-center',
    'regtime': 'regtime',
    'jino': 'jino',
    'majordomo': 'majordomo',
    'cpanel': 'cpanel',
    'plesk': 'plesk',
    'directadmin': 'directadmin',
    'ispmanager': 'ispmanager',
    'webmin': 'webmin',
    'cockpit': 'cockpit',
    
    // Containers
    'portainer': 'portainer',
    'rancher': 'rancher',
    'openshift': 'openshift',
    'minikube': 'minikube',
    'kind': 'kind',
    'k3s': 'k3s',
    'microk8s': 'microk8s',
    'k0s': 'k0s',
    'talos': 'talos',
    'flatcar': 'flatcar',
    'coreos': 'coreos',
    'fedora-coreos': 'fedora-coreos',
    'rhel-coreos': 'rhel-coreos',
    'suse-caasp': 'suse-caasp',
    'ubuntu-core': 'ubuntu-core',
    
    // Package managers
    'snap': 'snap',
    'flatpak': 'flatpak',
    'appimage': 'appimage',
    'rpm': 'rpm',
    'deb': 'deb',
    'apk': 'apk',
    'pacman': 'pacman',
    'portage': 'portage',
    'nix': 'nix',
    'guix': 'guix',
    'homebrew': 'homebrew',
    'macports': 'macports',
    'fink': 'fink',
    'pkgsrc': 'pkgsrc',
    'slackpkg': 'slackpkg',
    'slapt-get': 'slapt-get',
    'swupd': 'swupd',
    'zypper': 'zypper',
    'yum': 'yum',
    'dnf': 'dnf',
    'apt': 'apt',
    'aptitude': 'aptitude',
    'dpkg': 'dpkg',
    'yast': 'yast',
    'urpmi': 'urpmi',
    'smart': 'smart',
    'conary': 'conary',
    'paludis': 'paludis',
    'pkg': 'pkg',
    'ports': 'ports',
    'pkgin': 'pkgin',
    'xbps': 'xbps',
    'opkg': 'opkg',
    'ipkg': 'ipkg',
    'tazpkg': 'tazpkg',
    
    // Other
    'txt': 'plaintext',
    'log': 'log',
    'csv': 'csv',
    'tsv': 'tsv',
    'rtf': 'rtf',
    'odt': 'odt',
    'ods': 'ods',
    'odp': 'odp',
    'doc': 'doc',
    'docx': 'docx',
    'xls': 'xls',
    'xlsx': 'xlsx',
    'ppt': 'ppt',
    'pptx': 'pptx',
    'pdf': 'pdf',
    'epub': 'epub',
    'mobi': 'mobi',
    'azw': 'azw',
    'azw3': 'azw3',
    'fb2': 'fb2',
    'djvu': 'djvu',
    'chm': 'chm',
    'zip': 'zip',
    'rar': 'rar',
    '7z': '7z',
    'tar': 'tar',
    'gz': 'gz',
    'bz2': 'bz2',
    'xz': 'xz',
    'lzma': 'lzma',
    'z': 'z',
    'lz': 'lz',
    'lz4': 'lz4',
    'zst': 'zst',
    'lzop': 'lzop',
    'lha': 'lha',
    'lzh': 'lzh',
    'ace': 'ace',
    'arj': 'arj',
    'cab': 'cab',
    'msi': 'msi',
    'dmg': 'dmg',
    'iso': 'iso',
    'img': 'img',
    'bin': 'bin',
    'exe': 'exe',
    'app': 'app',
    'run': 'run',
    'vbs': 'vbs',
    'vba': 'vba',
    'vb': 'vb',
    'vbnet': 'vbnet',
    'for': 'fortran',
    'ftn': 'fortran',
    'fpp': 'fortran',
    'f66': 'fortran',
    'f68': 'fortran',
    'f15': 'fortran',
    'f18': 'fortran',
    'f23': 'fortran',
    'f2003': 'fortran',
    'f2008': 'fortran',
    'f2015': 'fortran',
    'f2018': 'fortran',
    'f2023': 'fortran'
  };
  return languageMap[extension] || 'plaintext';
};

export const getFileIcon = (filename: string): string => {
  const extension = getFileExtension(filename);
  const iconMap: Record<string, string> = {
    'js': '📄',
    'jsx': '⚛️',
    'ts': '📘',
    'tsx': '⚛️',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'cs': '🔷',
    'php': '🐘',
    'rb': '💎',
    'go': '🐹',
    'rs': '🦀',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'sass': '🎨',
    'less': '🎨',
    'json': '📋',
    'xml': '📄',
    'yaml': '⚙️',
    'yml': '⚙️',
    'md': '📝',
    'sql': '🗄️',
    'sh': '💻',
    'bash': '💻',
    'ps1': '💻',
    'bat': '💻',
    'cmd': '💻',
    'dockerfile': '🐳',
    'gitignore': '🚫',
    'env': '⚙️',
    'ini': '⚙️',
    'toml': '⚙️',
    'cfg': '⚙️',
    'conf': '⚙️'
  };
  return iconMap[extension] || '📄';
};

export const isTextFile = (filename: string): boolean => {
  const extension = getFileExtension(filename);
  const textExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs',
    'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml', 'md', 'sql',
    'sh', 'bash', 'ps1', 'bat', 'cmd', 'dockerfile', 'gitignore', 'env', 'ini', 'toml',
    'cfg', 'conf', 'txt', 'log', 'csv', 'tsv'
  ];
  return textExtensions.includes(extension);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const downloadFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string || '');
    };
    reader.onerror = (e) => {
      reject(e);
    };
    reader.readAsText(file);
  });
};

export const readMultipleFiles = async (files: FileList): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (isTextFile(file.name)) {
      try {
        const content = await readFileAsText(file);
        result[file.name] = content;
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
    }
  }
  
  return result;
};
