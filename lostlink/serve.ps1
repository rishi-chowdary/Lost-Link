using namespace System.Net
using namespace System.IO

$listener = [HttpListener]::new()
$listener.Prefixes.Add("http://localhost:8000/")
$listener.Start()
Write-Host "Listening on http://localhost:8000/"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $localPath = $request.Url.LocalPath.TrimStart('/')
    if ($localPath -eq '') { $localPath = 'index.html' }
    
    $filePath = Join-Path (Get-Location).Path $localPath

    if (Test-Path $filePath -PathType Leaf) {
        try {
            $buffer = [File]::ReadAllBytes($filePath)
            
            if ($filePath.EndsWith('.html')) { $response.ContentType = 'text/html' }
            elseif ($filePath.EndsWith('.css')) { $response.ContentType = 'text/css' }
            elseif ($filePath.EndsWith('.js')) { $response.ContentType = 'application/javascript' }
            
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } catch {
            $response.StatusCode = 500
        }
    } else {
        $response.StatusCode = 404
    }
    $response.Close()
}
