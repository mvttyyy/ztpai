"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { adminApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Music,
  Download,
  Star,
  Trash2,
  Shield,
  ShieldOff,
  Search,
  Loader2,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DashboardStats {
  totalUsers: number;
  totalLoops: number;
  totalDownloads: number;
  totalRatings: number;
  totalComments: number;
  recentUsers: any[];
  recentLoops: any[];
}

interface User {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  _count: {
    loops: number;
  };
}

interface Loop {
  id: string;
  title: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  createdAt: string;
  user: {
    username: string;
  };
  _count: {
    downloads: number;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersPage, setUsersPage] = useState(1);
  const [loopsPage, setLoopsPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [loopStatus, setLoopStatus] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "ADMIN")) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      fetchDashboard();
      fetchUsers();
      fetchLoops();
    }
  }, [isAuthenticated, user]);

  const fetchDashboard = async () => {
    try {
      const response = await adminApi.getDashboard();
      setStats(response.data);
    } catch (error) {}
  };

  const fetchUsers = async () => {
    try {
      const response = await adminApi.getUsers({
        page: usersPage,
        limit: 10,
        search: userSearch || undefined,
      });
      setUsers(response.data.data);
    } catch (error) {} finally {
      setLoading(false);
    }
  };

  const fetchLoops = async () => {
    try {
      const params: Record<string, any> = {
        page: loopsPage,
        limit: 10,
      };
      if (loopStatus !== "all") {
        params.status = loopStatus;
      }
      const response = await adminApi.getLoops(params);
      setLoops(response.data.data);
    } catch (error) {}
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      fetchUsers();
    }
  }, [usersPage, userSearch]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      fetchLoops();
    }
  }, [loopsPage, loopStatus]);

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await adminApi.updateUserRole(userId, role);
      toast({ title: "Role updated successfully" });
      fetchUsers();
    } catch (error) {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await adminApi.toggleUserStatus(userId);
      toast({ title: "User status toggled" });
      fetchUsers();
    } catch (error) {
      toast({ title: "Failed to toggle status", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await adminApi.deleteUser(userId);
      toast({ title: "User deleted successfully" });
      fetchUsers();
      fetchDashboard();
    } catch (error) {
      toast({ title: "Failed to delete user", variant: "destructive" });
    }
  };

  const handleUpdateLoopStatus = async (loopId: string, status: string) => {
    try {
      await adminApi.updateLoopStatus(loopId, status);
      toast({ title: "Loop status updated" });
      fetchLoops();
    } catch (error) {
      toast({ title: "Failed to update loop status", variant: "destructive" });
    }
  };

  const handleDeleteLoop = async (loopId: string) => {
    if (!confirm("Are you sure you want to delete this loop?")) return;
    try {
      await adminApi.deleteLoop(loopId);
      toast({ title: "Loop deleted successfully" });
      fetchLoops();
      fetchDashboard();
    } catch (error) {
      toast({ title: "Failed to delete loop", variant: "destructive" });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return null;
  }

  return (
    <main className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users, loops, and platform settings</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Loops</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLoops || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDownloads || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ratings</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRatings || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalComments || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Users and Loops */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="loops" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Loops
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Loops</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(value) => handleUpdateRole(u.id, value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">User</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? "default" : "destructive"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{u._count?.loops || 0}</TableCell>
                      <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(u.id)}
                            title={u.isActive ? "Deactivate" : "Activate"}
                          >
                            {u.isActive ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                  disabled={usersPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUsersPage((p) => p + 1)}
                  disabled={users.length < 10}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loops Tab */}
        <TabsContent value="loops" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loop Management</CardTitle>
              <CardDescription>View and manage all uploaded loops</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Select value={loopStatus} onValueChange={setLoopStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="READY">Ready</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loops.map((loop) => (
                    <TableRow key={loop.id}>
                      <TableCell className="font-medium">{loop.title}</TableCell>
                      <TableCell>{loop.user?.username}</TableCell>
                      <TableCell>
                        <Select
                          value={loop.status}
                          onValueChange={(value) => handleUpdateLoopStatus(loop.id, value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="PROCESSING">Processing</SelectItem>
                            <SelectItem value="READY">Ready</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{loop._count?.downloads || 0}</TableCell>
                      <TableCell>{new Date(loop.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLoop(loop.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setLoopsPage((p) => Math.max(1, p - 1))}
                  disabled={loopsPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLoopsPage((p) => p + 1)}
                  disabled={loops.length < 10}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
```  , 