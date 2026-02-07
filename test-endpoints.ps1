# API Endpoint Testing Script
param(
    [string]$BaseUrl = "http://localhost:3001"
)

Write-Host "🚀 Starting API Endpoint Tests..." -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray

# Global variables
$global:TestToken = $null
$global:TestUserId = $null
$global:TestProjectId = $null

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = $null,
        [hashtable]$Headers = $null
    )
    
    Write-Host "`nTesting: $Name" -ForegroundColor Yellow
    Write-Host "URL: $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        if ($Headers) {
            $params.Headers = $Headers
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "✅ SUCCESS" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            try {
                $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
                Write-Host "   Error: $($errorDetail.message)" -ForegroundColor Red
            }
            catch {
                Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
            }
        }
        return $null
    }
}

# Test 1: Health Check
Write-Host "`n=== HEALTH CHECK ===" -ForegroundColor Cyan
Test-Endpoint "Health Check" "$BaseUrl/api/health"

# Test 2: Authentication Endpoints
Write-Host "`n=== AUTHENTICATION TESTS ===" -ForegroundColor Cyan

# Register new user
$registerData = @{
    nom = "Test User $(Get-Random)"
    email = "test$(Get-Random)@example.com"
    motDePasse = "testpass123"
    numero = "123456789$(Get-Random -Maximum 10)"
    location = "Test City"
}

$registerResponse = Test-Endpoint "Register User" "$BaseUrl/api/auth/register" "POST" $registerData
if ($registerResponse) {
    # Check for token in different possible locations
    $global:TestToken = $registerResponse.token
    if (-not $global:TestToken -and $registerResponse.session) {
        $global:TestToken = $registerResponse.session.access_token
    }

    $global:TestUserId = $registerResponse.user.id
    
    if ($global:TestToken) {
        Write-Host "   Token: $($global:TestToken.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "   Warning: Token not found in response" -ForegroundColor Yellow
    }
    Write-Host "   User ID: $global:TestUserId" -ForegroundColor Gray
}

# Login with same user
if ($global:TestToken) {
    $loginData = @{
        email = $registerData.email
        motDePasse = $registerData.motDePasse
    }
    Test-Endpoint "Login User" "$BaseUrl/api/auth/login" "POST" $loginData
    
    # Get user profile
    $authHeaders = @{ Authorization = "Bearer $global:TestToken" }
    Test-Endpoint "Get User Profile" "$BaseUrl/api/auth/me" "GET" $null $authHeaders
}

# Test 3: Projects Endpoints
Write-Host "`n=== PROJECTS TESTS ===" -ForegroundColor Cyan

# Get all projects (public)
Test-Endpoint "Get All Projects" "$BaseUrl/api/projects"

if ($global:TestToken) {
    $authHeaders = @{ Authorization = "Bearer $global:TestToken" }
    
    # Create a project
    $projectData = @{
        location = "Test Project Location"
        description = "This is a test project description"
        materialsNeeded = "Test materials needed"
        estimatedDuration = 30
    }
    
    $projectResponse = Test-Endpoint "Create Project" "$BaseUrl/api/projects" "POST" $projectData $authHeaders
    if ($projectResponse) {
        $global:TestProjectId = $projectResponse.project.id
        Write-Host "   Project ID: $global:TestProjectId" -ForegroundColor Gray
        
        # Get specific project
        Test-Endpoint "Get Project by ID" "$BaseUrl/api/projects/$global:TestProjectId"
        
        # Update project
        $updateData = @{
            description = "Updated test project description"
        }
        Test-Endpoint "Update Project" "$BaseUrl/api/projects/$global:TestProjectId" "PATCH" $updateData $authHeaders
    }
}

# Test 4: Outils Endpoints
Write-Host "`n=== OUTILS TESTS ===" -ForegroundColor Cyan

# Get all outils (public)
Test-Endpoint "Get All Outils" "$BaseUrl/api/outils"

if ($global:TestToken) {
    $authHeaders = @{ Authorization = "Bearer $global:TestToken" }
    
    # Create an outil
    $outilData = @{
        nom = "Test Tool"
        location = "Test Tool Location"
        dureeMax = 7
    }
    
    $outilResponse = Test-Endpoint "Create Outil" "$BaseUrl/api/outils" "POST" $outilData $authHeaders
    if ($outilResponse) {
        $outilId = $outilResponse.outil.id
        Write-Host "   Outil ID: $outilId" -ForegroundColor Gray
        
        # Get specific outil
        Test-Endpoint "Get Outil by ID" "$BaseUrl/api/outils/$outilId"
        
        # Update outil
        $updateData = @{
            location = "Updated Tool Location"
        }
        Test-Endpoint "Update Outil" "$BaseUrl/api/outils/$outilId" "PATCH" $updateData $authHeaders
        
        # Offer outil to project (if we have a project)
        if ($global:TestProjectId) {
            $offerData = @{
                projectId = $global:TestProjectId
            }
            Test-Endpoint "Offer Outil to Project" "$BaseUrl/api/outils/$outilId/offer" "POST" $offerData $authHeaders
        }
    }
}

# Test 5: Materiel Endpoints
Write-Host "`n=== MATERIEL TESTS ===" -ForegroundColor Cyan

# Get all materiel (public)
Test-Endpoint "Get All Materiel" "$BaseUrl/api/materiel"

if ($global:TestToken) {
    $authHeaders = @{ Authorization = "Bearer $global:TestToken" }
    
    # Create materiel
    $materielData = @{
        nom = "Test Material"
        location = "Test Material Location"
    }
    
    $materielResponse = Test-Endpoint "Create Materiel" "$BaseUrl/api/materiel" "POST" $materielData $authHeaders
    if ($materielResponse) {
        $materielId = $materielResponse.materiel.id
        Write-Host "   Materiel ID: $materielId" -ForegroundColor Gray
        
        # Get specific materiel
        Test-Endpoint "Get Materiel by ID" "$BaseUrl/api/materiel/$materielId"
    }
}

# Test 6: Transport Endpoints
Write-Host "`n=== TRANSPORT TESTS ===" -ForegroundColor Cyan

# Get all transport (public)
Test-Endpoint "Get All Transport" "$BaseUrl/api/transport"

if ($global:TestToken) {
    $authHeaders = @{ Authorization = "Bearer $global:TestToken" }
    
    # Create transport
    $transportData = @{
        nom = "Test Vehicle"
        location = "Test Vehicle Location"
        numero = "TEST-123"
        dureeMax = 5
    }
    
    $transportResponse = Test-Endpoint "Create Transport" "$BaseUrl/api/transport" "POST" $transportData $authHeaders
    if ($transportResponse) {
        $transportId = $transportResponse.transport.id
        Write-Host "   Transport ID: $transportId" -ForegroundColor Gray
        
        # Get specific transport
        Test-Endpoint "Get Transport by ID" "$BaseUrl/api/transport/$transportId"
    }
}

# Test 7: Users Endpoints
Write-Host "`n=== USERS TESTS ===" -ForegroundColor Cyan

if ($global:TestUserId) {
    # Get user by ID (public)
    Test-Endpoint "Get User by ID" "$BaseUrl/api/users/$global:TestUserId"
    
    if ($global:TestToken) {
        $authHeaders = @{ Authorization = "Bearer $global:TestToken" }
        
        # Update user profile
        $updateData = @{
            location = "Updated Test City"
        }
        Test-Endpoint "Update User Profile" "$BaseUrl/api/users/$global:TestUserId" "PATCH" $updateData $authHeaders
    }
}

Write-Host "`n🏁 API Testing Complete!" -ForegroundColor Cyan